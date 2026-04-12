use std::{collections::HashMap, fs, time::Duration};

use anyhow::{anyhow, Context};
use rusqlite::{params, Connection, OptionalExtension, ToSql, Transaction};
use rusqlite_migration::{Migrations, M};
use tauri::{AppHandle, Manager};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::error::{AppResult, BusinessError};

use super::models::{Block, DeleteBlockResult, Tag};

const DATABASE_FILE_NAME: &str = "fluxnote.sqlite3";

pub struct NoteService {
    conn: Connection,
}

impl NoteService {
    pub fn open(app: &AppHandle) -> anyhow::Result<Self> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .context("failed to resolve app data directory")?;

        fs::create_dir_all(&app_data_dir).with_context(|| {
            format!(
                "failed to create app data directory: {}",
                app_data_dir.display()
            )
        })?;

        let database_path = app_data_dir.join(DATABASE_FILE_NAME);
        let mut conn = Connection::open(&database_path).with_context(|| {
            format!(
                "failed to open sqlite database: {}",
                database_path.display()
            )
        })?;

        conn.busy_timeout(Duration::from_secs(5))
            .context("failed to set sqlite busy timeout")?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .context("failed to enable sqlite foreign keys")?;

        migrations()
            .to_latest(&mut conn)
            .context("failed to apply sqlite migrations")?;

        Ok(Self { conn })
    }

    pub fn list_blocks(&mut self, tag_ids: &[String]) -> AppResult<Vec<Block>> {
        let blocks = if tag_ids.is_empty() {
            self.list_all_blocks()?
        } else {
            self.list_blocks_by_tag_ids(tag_ids)?
        };

        self.attach_tags(blocks)
    }

    pub fn create_block(&mut self) -> AppResult<Block> {
        let now = timestamp_now()?;
        let block_id = create_id();
        let tx = self.begin_tx()?;
        let next_position = next_block_position(&tx)?;

        tx.execute(
            "INSERT INTO blocks (id, position, content, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![block_id, next_position, "", now, now],
        )
        .context("failed to insert block")?;

        let block = get_block_by_id(&tx, &block_id)?
            .ok_or_else(|| anyhow!("created block was not found immediately after insert"))?;

        tx.commit()
            .context("failed to commit create block transaction")?;

        Ok(block)
    }

    pub fn update_block_content(&mut self, block_id: &str, content: &str) -> AppResult<Block> {
        let now = timestamp_now()?;
        let tx = self.begin_tx()?;

        ensure_block_exists(&tx, block_id)?;

        tx.execute(
            "UPDATE blocks
             SET content = ?2, updated_at = ?3
             WHERE id = ?1",
            params![block_id, content, now],
        )
        .context("failed to update block content")?;

        let block = get_block_by_id(&tx, block_id)?
            .ok_or_else(|| anyhow!("updated block was not found immediately after update"))?;

        tx.commit()
            .context("failed to commit update block transaction")?;

        Ok(block)
    }

    pub fn delete_block(&mut self, block_id: &str) -> AppResult<DeleteBlockResult> {
        let tx = self.begin_tx()?;
        let block_meta = get_block_meta(&tx, block_id)?
            .ok_or_else(|| BusinessError::NotFound(block_id.to_string()))?;

        tx.execute("DELETE FROM blocks WHERE id = ?1", params![block_id])
            .context("failed to delete block")?;
        tx.execute(
            "UPDATE blocks
             SET position = position - 1
             WHERE position > ?1",
            params![block_meta.position],
        )
        .context("failed to compact block positions")?;

        tx.commit()
            .context("failed to commit delete block transaction")?;

        Ok(DeleteBlockResult {
            deleted_block_id: block_id.to_string(),
        })
    }

    pub fn list_tags(&mut self) -> AppResult<Vec<Tag>> {
        let mut statement = self
            .conn
            .prepare(
                "SELECT id, name, created_at, updated_at
                 FROM tags
                 ORDER BY name COLLATE NOCASE ASC, created_at ASC",
            )
            .context("failed to prepare tag list query")?;

        let rows = statement
            .query_map([], map_tag)
            .context("failed to query tags")?;

        rows.collect::<rusqlite::Result<Vec<_>>>()
            .context("failed to materialize tags")
            .map_err(Into::into)
    }

    pub fn create_tag(&mut self, raw_name: &str) -> AppResult<Tag> {
        let name = normalize_tag_name(raw_name)?;
        let now = timestamp_now()?;
        let tag_id = create_id();
        let tx = self.begin_tx()?;

        tx.execute(
            "INSERT INTO tags (id, name, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![tag_id, name, now, now],
        )
        .map_err(map_tag_write_error)?;

        let tag = get_tag_by_id(&tx, &tag_id)?
            .ok_or_else(|| anyhow!("created tag was not found immediately after insert"))?;

        tx.commit()
            .context("failed to commit create tag transaction")?;

        Ok(tag)
    }

    pub fn delete_tag(&mut self, tag_id: &str) -> AppResult<()> {
        let deleted_rows = self
            .conn
            .execute("DELETE FROM tags WHERE id = ?1", params![tag_id])
            .context("failed to delete tag")?;

        if deleted_rows == 0 {
            return Err(BusinessError::NotFound(tag_id.to_string()).into());
        }

        Ok(())
    }

    pub fn set_block_tags(&mut self, block_id: &str, tag_ids: &[String]) -> AppResult<Block> {
        let normalized_tag_ids = dedupe_ids(tag_ids);
        let tx = self.begin_tx()?;
        ensure_block_exists(&tx, block_id)?;

        if !normalized_tag_ids.is_empty() {
            let matched_tag_count = count_matching_tags(&tx, &normalized_tag_ids)?;
            if matched_tag_count != normalized_tag_ids.len() {
                return Err(BusinessError::InvalidOperation(
                    "One or more tags do not exist".to_string(),
                    None,
                )
                .into());
            }
        }

        tx.execute(
            "DELETE FROM block_tags WHERE block_id = ?1",
            params![block_id],
        )
        .context("failed to clear block tags")?;

        for tag_id in &normalized_tag_ids {
            tx.execute(
                "INSERT INTO block_tags (block_id, tag_id)
                 VALUES (?1, ?2)",
                params![block_id, tag_id],
            )
            .context("failed to attach tag to block")?;
        }

        let block = get_block_by_id(&tx, block_id)?
            .ok_or_else(|| anyhow!("updated block was not found after setting tags"))?;

        tx.commit()
            .context("failed to commit set block tags transaction")?;

        let mut blocks = self.attach_tags(vec![block])?;
        blocks
            .pop()
            .ok_or_else(|| anyhow!("updated block was not found after attaching tags").into())
    }

    fn list_all_blocks(&self) -> AppResult<Vec<Block>> {
        let mut statement = self
            .conn
            .prepare(
                "SELECT id, position, content, created_at, updated_at
                 FROM blocks
                 ORDER BY position ASC",
            )
            .context("failed to prepare block list query")?;

        let rows = statement
            .query_map([], map_block)
            .context("failed to query blocks")?;

        rows.collect::<rusqlite::Result<Vec<_>>>()
            .context("failed to materialize blocks")
            .map_err(Into::into)
    }

    fn list_blocks_by_tag_ids(&self, tag_ids: &[String]) -> AppResult<Vec<Block>> {
        let placeholders = std::iter::repeat_n("?", tag_ids.len())
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT b.id, b.position, b.content, b.created_at, b.updated_at
             FROM blocks b
             JOIN block_tags bt ON bt.block_id = b.id
             WHERE bt.tag_id IN ({placeholders})
             GROUP BY b.id, b.position, b.content, b.created_at, b.updated_at
             HAVING COUNT(DISTINCT bt.tag_id) = ?
             ORDER BY b.position ASC"
        );

        let mut params = tag_ids
            .iter()
            .map(|tag_id| tag_id as &dyn ToSql)
            .collect::<Vec<_>>();
        let required_matches = tag_ids.len() as i64;
        params.push(&required_matches);

        let mut statement = self
            .conn
            .prepare(&sql)
            .context("failed to prepare filtered block list query")?;
        let rows = statement
            .query_map(params.as_slice(), map_block)
            .context("failed to query filtered blocks")?;

        rows.collect::<rusqlite::Result<Vec<_>>>()
            .context("failed to materialize filtered blocks")
            .map_err(Into::into)
    }

    fn attach_tags(&self, blocks: Vec<Block>) -> AppResult<Vec<Block>> {
        if blocks.is_empty() {
            return Ok(blocks);
        }

        let block_ids = blocks
            .iter()
            .map(|block| block.id.clone())
            .collect::<Vec<_>>();
        let tags_by_block_id = list_tags_for_block_ids(&self.conn, &block_ids)?;

        Ok(blocks
            .into_iter()
            .map(|mut block| {
                block.tags = tags_by_block_id.get(&block.id).cloned().unwrap_or_default();
                block
            })
            .collect())
    }

    fn begin_tx(&mut self) -> anyhow::Result<Transaction<'_>> {
        self.conn
            .transaction()
            .context("failed to start sqlite transaction")
    }
}

fn migrations() -> Migrations<'static> {
    Migrations::new(vec![
        M::up(
            "
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS note_blocks (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                position INTEGER NOT NULL CHECK (position >= 0),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_note_blocks_note_id_position
                ON note_blocks(note_id, position);

            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        ),
        M::up(
            "
            DROP TABLE IF EXISTS block_tags;
            DROP TABLE IF EXISTS tags;
            DROP TABLE IF EXISTS blocks;
            DROP TABLE IF EXISTS note_blocks;
            DROP TABLE IF EXISTS notes;
            DROP TABLE IF EXISTS app_meta;

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
            ",
        ),
    ])
}

fn timestamp_now() -> anyhow::Result<String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .context("failed to format timestamp")
}

fn create_id() -> String {
    Uuid::now_v7().to_string()
}

fn dedupe_ids(ids: &[String]) -> Vec<String> {
    let mut deduped_ids = Vec::with_capacity(ids.len());

    for id in ids {
        if id.is_empty() || deduped_ids.contains(id) {
            continue;
        }

        deduped_ids.push(id.clone());
    }

    deduped_ids
}

fn normalize_tag_name(raw_name: &str) -> AppResult<String> {
    let trimmed_name = raw_name.trim();

    if trimmed_name.is_empty() {
        return Err(BusinessError::InvalidOperation(
            "Tag name must not be empty".to_string(),
            None,
        )
        .into());
    }

    Ok(trimmed_name.to_string())
}

fn map_tag_write_error(error: rusqlite::Error) -> crate::error::AppError {
    match error {
        rusqlite::Error::SqliteFailure(sqlite_error, _) => {
            if sqlite_error.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE {
                return BusinessError::InvalidOperation(
                    "Tag name already exists".to_string(),
                    None,
                )
                .into();
            }

            anyhow::Error::new(rusqlite::Error::SqliteFailure(sqlite_error, None)).into()
        }
        other => anyhow::Error::new(other).into(),
    }
}

fn ensure_block_exists(tx: &Transaction<'_>, block_id: &str) -> AppResult<()> {
    if get_block_meta(tx, block_id)?.is_none() {
        return Err(BusinessError::NotFound(block_id.to_string()).into());
    }

    Ok(())
}

fn next_block_position(tx: &Transaction<'_>) -> anyhow::Result<i64> {
    tx.query_row(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM blocks",
        [],
        |row| row.get(0),
    )
    .context("failed to compute next block position")
}

fn count_matching_tags(tx: &Transaction<'_>, tag_ids: &[String]) -> anyhow::Result<usize> {
    let placeholders = std::iter::repeat_n("?", tag_ids.len())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!("SELECT COUNT(*) FROM tags WHERE id IN ({placeholders})");
    let params = tag_ids
        .iter()
        .map(|id| id as &dyn ToSql)
        .collect::<Vec<_>>();

    tx.query_row(&sql, params.as_slice(), |row| row.get::<_, i64>(0))
        .map(|count| count as usize)
        .context("failed to count matching tags")
}

fn list_tags_for_block_ids(
    conn: &Connection,
    block_ids: &[String],
) -> anyhow::Result<HashMap<String, Vec<Tag>>> {
    let placeholders = std::iter::repeat_n("?", block_ids.len())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "SELECT bt.block_id, t.id, t.name, t.created_at, t.updated_at
         FROM block_tags bt
         JOIN tags t ON t.id = bt.tag_id
         WHERE bt.block_id IN ({placeholders})
         ORDER BY t.name COLLATE NOCASE ASC, t.created_at ASC"
    );
    let params = block_ids
        .iter()
        .map(|block_id| block_id as &dyn ToSql)
        .collect::<Vec<_>>();
    let mut statement = conn
        .prepare(&sql)
        .context("failed to prepare block tags query")?;
    let rows = statement
        .query_map(params.as_slice(), |row| {
            Ok((
                row.get::<_, String>(0)?,
                Tag {
                    id: row.get(1)?,
                    name: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                },
            ))
        })
        .context("failed to query block tags")?;

    let pairs = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .context("failed to materialize block tags")?;
    let mut tags_by_block_id: HashMap<String, Vec<Tag>> = HashMap::new();

    for (block_id, tag) in pairs {
        tags_by_block_id.entry(block_id).or_default().push(tag);
    }

    Ok(tags_by_block_id)
}

fn get_tag_by_id(tx: &Transaction<'_>, tag_id: &str) -> anyhow::Result<Option<Tag>> {
    tx.query_row(
        "SELECT id, name, created_at, updated_at FROM tags WHERE id = ?1",
        params![tag_id],
        map_tag,
    )
    .optional()
    .context("failed to query tag by id")
}

struct BlockMeta {
    position: i64,
}

fn get_block_meta(tx: &Transaction<'_>, block_id: &str) -> anyhow::Result<Option<BlockMeta>> {
    tx.query_row(
        "SELECT position FROM blocks WHERE id = ?1",
        params![block_id],
        |row| {
            Ok(BlockMeta {
                position: row.get(0)?,
            })
        },
    )
    .optional()
    .context("failed to query block metadata")
}

fn get_block_by_id(tx: &Transaction<'_>, block_id: &str) -> anyhow::Result<Option<Block>> {
    tx.query_row(
        "SELECT id, position, content, created_at, updated_at
         FROM blocks
         WHERE id = ?1",
        params![block_id],
        map_block,
    )
    .optional()
    .context("failed to query block by id")
}

fn map_tag(row: &rusqlite::Row<'_>) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
        updated_at: row.get(3)?,
    })
}

fn map_block(row: &rusqlite::Row<'_>) -> rusqlite::Result<Block> {
    Ok(Block {
        id: row.get(0)?,
        position: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        tags: Vec::new(),
    })
}
