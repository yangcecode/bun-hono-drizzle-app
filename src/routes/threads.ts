/**
 * Thread Management API
 *
 * Provides endpoints for:
 * - Listing all threads
 * - Getting thread state history (Time Travel)
 * - Getting specific checkpoint state
 * - Deleting threads
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { createCheckpointer } from '../langgraph/checkpointer';

const threads = new Hono<Env>();

/**
 * GET /threads
 * List all unique thread IDs
 */
threads.get('/', async (c) => {
  const db = c.env.my_db;
  if (!db) {
    return c.json({ error: 'Database not available' }, 500);
  }

  const saver = createCheckpointer(db);
  const threadIds = await saver.listThreads();

  return c.json({
    threads: threadIds.map((id) => ({ thread_id: id })),
    count: threadIds.length,
  });
});

/**
 * GET /threads/:threadId/history
 * Get the state history for a specific thread (for Time Travel)
 */
threads.get('/:threadId/history', async (c) => {
  const { threadId } = c.req.param();
  const db = c.env.my_db;

  if (!db) {
    return c.json({ error: 'Database not available' }, 500);
  }

  const saver = createCheckpointer(db);
  const config = { configurable: { thread_id: threadId } };

  const history: Array<{
    checkpoint_id: string;
    parent_checkpoint_id?: string;
    step: number;
    source: string;
    timestamp: string;
    summary: {
      hasClassification: boolean;
      intent?: string;
      urgency?: string;
      hasResponse: boolean;
    };
  }> = [];

  // Collect checkpoint history
  for await (const tuple of saver.list(config)) {
    const checkpointId = tuple.config.configurable?.checkpoint_id as string;
    const parentId = tuple.parentConfig?.configurable?.checkpoint_id as string | undefined;
    const state = tuple.checkpoint.channel_values as Record<string, unknown>;

    const classification = state?.classification as Record<string, unknown> | undefined;

    history.push({
      checkpoint_id: checkpointId,
      parent_checkpoint_id: parentId,
      step: tuple.metadata?.step ?? -1,
      source: tuple.metadata?.source ?? 'unknown',
      timestamp: tuple.checkpoint.ts,
      summary: {
        hasClassification: !!classification,
        intent: classification?.intent as string | undefined,
        urgency: classification?.urgency as string | undefined,
        hasResponse: !!state?.responseText,
      },
    });
  }

  return c.json({
    threadId,
    history,
    count: history.length,
  });
});

/**
 * GET /threads/:threadId/checkpoints/:checkpointId
 * Get the full state of a specific checkpoint
 */
threads.get('/:threadId/checkpoints/:checkpointId', async (c) => {
  const { threadId, checkpointId } = c.req.param();
  const db = c.env.my_db;

  if (!db) {
    return c.json({ error: 'Database not available' }, 500);
  }

  const saver = createCheckpointer(db);
  const config = {
    configurable: {
      thread_id: threadId,
      checkpoint_id: checkpointId,
    },
  };

  const tuple = await saver.getTuple(config);

  if (!tuple) {
    return c.json({ error: 'Checkpoint not found' }, 404);
  }

  return c.json({
    threadId,
    checkpointId,
    state: tuple.checkpoint.channel_values,
    metadata: tuple.metadata,
    parentCheckpointId: tuple.parentConfig?.configurable?.checkpoint_id,
    timestamp: tuple.checkpoint.ts,
  });
});

/**
 * GET /threads/:threadId/state
 * Get the latest state of a thread
 */
threads.get('/:threadId/state', async (c) => {
  const { threadId } = c.req.param();
  const db = c.env.my_db;

  if (!db) {
    return c.json({ error: 'Database not available' }, 500);
  }

  const saver = createCheckpointer(db);
  const config = { configurable: { thread_id: threadId } };

  const tuple = await saver.getTuple(config);

  if (!tuple) {
    return c.json({ error: 'Thread not found' }, 404);
  }

  return c.json({
    threadId,
    checkpointId: tuple.config.configurable?.checkpoint_id,
    state: tuple.checkpoint.channel_values,
    metadata: tuple.metadata,
    timestamp: tuple.checkpoint.ts,
    hasPendingWrites: (tuple.pendingWrites?.length ?? 0) > 0,
  });
});

/**
 * DELETE /threads/:threadId
 * Delete all checkpoints and writes for a thread
 */
threads.delete('/:threadId', async (c) => {
  const { threadId } = c.req.param();
  const db = c.env.my_db;

  if (!db) {
    return c.json({ error: 'Database not available' }, 500);
  }

  const saver = createCheckpointer(db);
  await saver.deleteThread(threadId);

  return c.json({
    success: true,
    threadId,
    message: `Thread ${threadId} deleted successfully`,
  });
});

export default threads;
