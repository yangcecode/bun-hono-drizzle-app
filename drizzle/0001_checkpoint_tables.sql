-- Migration: Add LangGraph checkpoint tables
-- Created: 2026-01-16
-- Description: Creates tables for LangGraph state persistence

-- Checkpoints table stores the graph state at each step
CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint BLOB NOT NULL,
    metadata BLOB NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

-- Checkpoint writes table stores pending writes for durability
CREATE TABLE IF NOT EXISTS checkpoint_writes (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    type TEXT,
    value BLOB,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread ON checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_parent ON checkpoints(thread_id, checkpoint_ns, parent_checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_writes_thread ON checkpoint_writes(thread_id, checkpoint_id);
