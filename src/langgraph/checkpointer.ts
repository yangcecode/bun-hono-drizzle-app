/**
 * D1 Checkpointer for LangGraph
 *
 * This module implements a custom checkpointer using Cloudflare D1 as the backend.
 * It enables:
 * - Memory: Agent state persistence across requests
 * - Persistence: State survives server restarts
 * - Durable Execution: Can resume from where it left off
 * - Time Travel: Can replay from any historical checkpoint
 */

import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointListOptions,
  CheckpointTuple,
  type ChannelVersions,
} from '@langchain/langgraph-checkpoint';
import type { CheckpointMetadata, PendingWrite } from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';

// Helper to convert Uint8Array to base64 string for D1 storage
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert base64 string back to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface CheckpointRow {
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  parent_checkpoint_id: string | null;
  type: string | null;
  checkpoint: string; // base64 encoded
  metadata: string; // base64 encoded
  created_at: string;
}

interface WriteRow {
  thread_id: string;
  checkpoint_ns: string;
  checkpoint_id: string;
  task_id: string;
  idx: number;
  channel: string;
  type: string | null;
  value: string | null; // base64 encoded
}

/**
 * D1-backed checkpointer for LangGraph
 * Stores checkpoint state in Cloudflare D1 database
 */
export class D1Saver extends BaseCheckpointSaver {
  private db: D1Database;

  constructor(db: D1Database) {
    super();
    this.db = db;
  }

  /**
   * Create a D1Saver from a D1Database connection
   */
  static fromConn(db: D1Database): D1Saver {
    return new D1Saver(db);
  }

  /**
   * Get thread_id and checkpoint_ns from config
   */
  private getConfigValues(config: RunnableConfig): {
    threadId: string;
    checkpointNs: string;
    checkpointId?: string;
  } {
    const configurable = config.configurable || {};
    return {
      threadId: configurable.thread_id as string,
      checkpointNs: (configurable.checkpoint_ns as string) || '',
      checkpointId: configurable.checkpoint_id as string | undefined,
    };
  }

  /**
   * Get a checkpoint tuple from the database
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const { threadId, checkpointNs, checkpointId } = this.getConfigValues(config);

    if (!threadId) {
      return undefined;
    }

    let row: CheckpointRow | null = null;

    if (checkpointId) {
      // Get specific checkpoint
      const result = await this.db
        .prepare(
          `SELECT * FROM checkpoints 
           WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?`
        )
        .bind(threadId, checkpointNs, checkpointId)
        .first<CheckpointRow>();
      row = result;
    } else {
      // Get latest checkpoint for thread
      const result = await this.db
        .prepare(
          `SELECT * FROM checkpoints 
           WHERE thread_id = ? AND checkpoint_ns = ? 
           ORDER BY checkpoint_id DESC LIMIT 1`
        )
        .bind(threadId, checkpointNs)
        .first<CheckpointRow>();
      row = result;
    }

    if (!row) {
      return undefined;
    }

    // Load checkpoint data
    const [checkpointType, checkpointData] = [
      row.type || 'json',
      base64ToUint8Array(row.checkpoint),
    ];
    const checkpoint = (await this.serde.loadsTyped(checkpointType, checkpointData)) as Checkpoint;

    // Load metadata
    const [metadataType, metadataData] = ['json', base64ToUint8Array(row.metadata)];
    const metadata = (await this.serde.loadsTyped(
      metadataType,
      metadataData
    )) as CheckpointMetadata;

    // Load pending writes
    const writesResult = await this.db
      .prepare(
        `SELECT * FROM checkpoint_writes 
         WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
         ORDER BY idx`
      )
      .bind(threadId, checkpointNs, row.checkpoint_id)
      .all<WriteRow>();

    const pendingWrites: [string, string, unknown][] = [];
    for (const writeRow of writesResult.results || []) {
      if (writeRow.value) {
        const value = await this.serde.loadsTyped(
          writeRow.type || 'json',
          base64ToUint8Array(writeRow.value)
        );
        pendingWrites.push([writeRow.task_id, writeRow.channel, value]);
      }
    }

    // Build parent config if exists
    let parentConfig: RunnableConfig | undefined;
    if (row.parent_checkpoint_id) {
      parentConfig = {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: row.parent_checkpoint_id,
        },
      };
    }

    return {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: row.checkpoint_id,
        },
      },
      checkpoint,
      metadata,
      parentConfig,
      pendingWrites,
    };
  }

  /**
   * List checkpoints for a thread
   */
  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions
  ): AsyncGenerator<CheckpointTuple> {
    const { threadId, checkpointNs } = this.getConfigValues(config);

    if (!threadId) {
      return;
    }

    let query = `SELECT * FROM checkpoints WHERE thread_id = ? AND checkpoint_ns = ?`;
    const params: (string | number)[] = [threadId, checkpointNs];

    if (options?.before) {
      const beforeId = options.before.configurable?.checkpoint_id;
      if (beforeId) {
        query += ` AND checkpoint_id < ?`;
        params.push(beforeId as string);
      }
    }

    query += ` ORDER BY checkpoint_id DESC`;

    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<CheckpointRow>();

    for (const row of result.results || []) {
      const [checkpointType, checkpointData] = [
        row.type || 'json',
        base64ToUint8Array(row.checkpoint),
      ];
      const checkpoint = (await this.serde.loadsTyped(
        checkpointType,
        checkpointData
      )) as Checkpoint;

      const [metadataType, metadataData] = ['json', base64ToUint8Array(row.metadata)];
      const metadata = (await this.serde.loadsTyped(
        metadataType,
        metadataData
      )) as CheckpointMetadata;

      let parentConfig: RunnableConfig | undefined;
      if (row.parent_checkpoint_id) {
        parentConfig = {
          configurable: {
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: row.parent_checkpoint_id,
          },
        };
      }

      yield {
        config: {
          configurable: {
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: row.checkpoint_id,
          },
        },
        checkpoint,
        metadata,
        parentConfig,
      };
    }
  }

  /**
   * Save a checkpoint to the database
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: ChannelVersions
  ): Promise<RunnableConfig> {
    const { threadId, checkpointNs } = this.getConfigValues(config);

    if (!threadId) {
      throw new Error('thread_id is required in config');
    }

    // Serialize checkpoint and metadata
    const [checkpointType, checkpointData] = await this.serde.dumpsTyped(checkpoint);
    const [_metadataType, metadataData] = await this.serde.dumpsTyped(metadata);

    // Get parent checkpoint ID from config
    const parentCheckpointId = config.configurable?.checkpoint_id as string | undefined;

    // Insert or replace checkpoint
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO checkpoints 
         (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        threadId,
        checkpointNs,
        checkpoint.id,
        parentCheckpointId || null,
        checkpointType,
        uint8ArrayToBase64(checkpointData),
        uint8ArrayToBase64(metadataData)
      )
      .run();

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  /**
   * Store pending writes for a checkpoint
   */
  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const { threadId, checkpointNs, checkpointId } = this.getConfigValues(config);

    if (!threadId || !checkpointId) {
      throw new Error('thread_id and checkpoint_id are required for putWrites');
    }

    const statements = [];

    for (let idx = 0; idx < writes.length; idx++) {
      const [channel, value] = writes[idx];
      const [valueType, valueData] = await this.serde.dumpsTyped(value);

      statements.push(
        this.db
          .prepare(
            `INSERT OR REPLACE INTO checkpoint_writes 
             (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            threadId,
            checkpointNs,
            checkpointId,
            taskId,
            idx,
            channel,
            valueType,
            uint8ArrayToBase64(valueData)
          )
      );
    }

    if (statements.length > 0) {
      await this.db.batch(statements);
    }
  }

  /**
   * Delete all checkpoints and writes for a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare('DELETE FROM checkpoints WHERE thread_id = ?').bind(threadId),
      this.db.prepare('DELETE FROM checkpoint_writes WHERE thread_id = ?').bind(threadId),
    ]);
  }

  /**
   * Get all unique thread IDs
   */
  async listThreads(): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT DISTINCT thread_id FROM checkpoints ORDER BY thread_id')
      .all<{ thread_id: string }>();

    return (result.results || []).map((r) => r.thread_id);
  }
}

/**
 * Create a D1 checkpointer from a database connection
 */
export function createCheckpointer(db: D1Database): D1Saver {
  return D1Saver.fromConn(db);
}
