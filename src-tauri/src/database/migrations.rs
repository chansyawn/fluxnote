use anyhow::Context;
use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};

const INITIAL_SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    position INTEGER NOT NULL CHECK (position >= 0),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blocks_position
    ON blocks(position);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS block_tags (
    block_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (block_id, tag_id),
    FOREIGN KEY(block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_block_tags_tag_id
    ON block_tags(tag_id);
";

pub fn apply(conn: &mut Connection) -> anyhow::Result<()> {
    Migrations::new(vec![M::up(INITIAL_SCHEMA)])
        .to_latest(conn)
        .context("failed to apply final schema migration")
}
