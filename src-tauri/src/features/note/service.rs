use std::{fs, time::Duration};

use anyhow::{anyhow, Context};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use rusqlite_migration::{Migrations, M};
use tauri::{AppHandle, Manager};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::error::{AppResult, BusinessError};

use super::models::{DeleteNoteBlockResult, NoteBlock, NoteDetail, NoteSummary};

const DATABASE_FILE_NAME: &str = "fluxnote.sqlite3";
const INBOX_NOTE_ID_KEY: &str = "inbox_note_id";
const DEFAULT_NOTE_TITLE: &str = "My Note";

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

        let mut service = Self { conn };
        service
            .ensure_inbox_note()
            .context("failed to initialize inbox note")?;
        Ok(service)
    }

    pub fn get_inbox_note_id(&mut self) -> AppResult<String> {
        self.resolve_inbox_note_id()
    }

    pub fn get_note_by_id(&mut self, note_id: &str) -> AppResult<NoteDetail> {
        let note = self.get_note_summary(note_id)?;
        let blocks = self.list_blocks(note_id)?;

        Ok(NoteDetail { note, blocks })
    }

    pub fn create_note_block(&mut self, note_id: &str) -> AppResult<NoteBlock> {
        let now = timestamp_now()?;
        let block_id = create_id();
        let tx = self.begin_tx()?;

        if !note_exists_in_tx(&tx, note_id)? {
            return Err(BusinessError::NotFound(note_id.to_string()).into());
        }

        let next_position = next_block_position(&tx, note_id)?;
        tx.execute(
            "INSERT INTO note_blocks (id, note_id, position, content, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![block_id, note_id, next_position, "", now, now],
        )
        .context("failed to insert note block")?;
        touch_note(&tx, note_id, &now)?;

        let block = get_block_by_id(&tx, &block_id)?
            .ok_or_else(|| anyhow!("created block was not found immediately after insert"))?;

        tx.commit()
            .context("failed to commit create block transaction")?;
        Ok(block)
    }

    pub fn update_note_block_content(
        &mut self,
        block_id: &str,
        content: &str,
    ) -> AppResult<NoteBlock> {
        let now = timestamp_now()?;
        let tx = self.begin_tx()?;

        let note_id = get_block_note_id(&tx, block_id)?
            .ok_or_else(|| BusinessError::NotFound(block_id.to_string()))?;

        tx.execute(
            "UPDATE note_blocks
             SET content = ?2, updated_at = ?3
             WHERE id = ?1",
            params![block_id, content, now],
        )
        .context("failed to update note block content")?;
        touch_note(&tx, &note_id, &now)?;

        let block = get_block_by_id(&tx, block_id)?
            .ok_or_else(|| anyhow!("updated block was not found immediately after update"))?;

        tx.commit()
            .context("failed to commit update block transaction")?;
        Ok(block)
    }

    pub fn delete_note_block(&mut self, block_id: &str) -> AppResult<DeleteNoteBlockResult> {
        let now = timestamp_now()?;
        let tx = self.begin_tx()?;

        let block_meta = get_block_meta(&tx, block_id)?
            .ok_or_else(|| BusinessError::NotFound(block_id.to_string()))?;
        let block_count = count_note_blocks(&tx, &block_meta.note_id)?;

        if block_count <= 1 {
            return Err(BusinessError::InvalidOperation(
                "A note must keep at least one block".to_string(),
                None,
            )
            .into());
        }

        tx.execute("DELETE FROM note_blocks WHERE id = ?1", params![block_id])
            .context("failed to delete note block")?;
        tx.execute(
            "UPDATE note_blocks
             SET position = position - 1
             WHERE note_id = ?1 AND position > ?2",
            params![block_meta.note_id, block_meta.position],
        )
        .context("failed to compact note block positions")?;
        touch_note(&tx, &block_meta.note_id, &now)?;

        tx.commit()
            .context("failed to commit delete block transaction")?;

        Ok(DeleteNoteBlockResult {
            deleted_block_id: block_id.to_string(),
        })
    }

    fn ensure_inbox_note(&mut self) -> anyhow::Result<String> {
        if let Some(note_id) = self.find_inbox_note_id()? {
            return Ok(note_id);
        }

        let now = timestamp_now()?;
        let note_id = create_id();
        let block_id = create_id();
        let tx = self.begin_tx()?;

        tx.execute(
            "INSERT INTO notes (id, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![note_id, DEFAULT_NOTE_TITLE, now, now],
        )
        .context("failed to insert inbox note")?;
        tx.execute(
            "INSERT INTO note_blocks (id, note_id, position, content, created_at, updated_at)
             VALUES (?1, ?2, 0, '', ?3, ?4)",
            params![block_id, note_id, now, now],
        )
        .context("failed to insert inbox note block")?;
        set_meta_value(&tx, INBOX_NOTE_ID_KEY, &note_id)?;
        tx.commit()
            .context("failed to commit inbox note transaction")?;

        Ok(note_id)
    }

    fn resolve_inbox_note_id(&mut self) -> AppResult<String> {
        if let Some(note_id) = self.find_inbox_note_id()? {
            return Ok(note_id);
        }

        self.ensure_inbox_note().map_err(Into::into)
    }

    fn find_inbox_note_id(&mut self) -> anyhow::Result<Option<String>> {
        let Some(note_id) = get_meta_value(&self.conn, INBOX_NOTE_ID_KEY)? else {
            return Ok(None);
        };

        if note_exists(&self.conn, &note_id)? {
            return Ok(Some(note_id));
        }

        self.conn
            .execute(
                "DELETE FROM app_meta WHERE key = ?1",
                params![INBOX_NOTE_ID_KEY],
            )
            .context("failed to clear stale inbox note id")?;

        Ok(None)
    }

    fn get_note_summary(&self, note_id: &str) -> AppResult<NoteSummary> {
        self.conn
            .query_row(
                "SELECT id, title, created_at, updated_at FROM notes WHERE id = ?1",
                params![note_id],
                map_note_summary,
            )
            .optional()
            .context("failed to query note summary")?
            .ok_or_else(|| BusinessError::NotFound(note_id.to_string()).into())
    }

    fn list_blocks(&self, note_id: &str) -> AppResult<Vec<NoteBlock>> {
        let mut statement = self
            .conn
            .prepare(
                "SELECT id, note_id, position, content, created_at, updated_at
                 FROM note_blocks
                 WHERE note_id = ?1
                 ORDER BY position ASC",
            )
            .context("failed to prepare note block list query")?;

        let rows = statement
            .query_map(params![note_id], map_note_block)
            .context("failed to query note blocks")?;

        rows.collect::<rusqlite::Result<Vec<_>>>()
            .context("failed to materialize note blocks")
            .map_err(Into::into)
    }

    fn begin_tx(&mut self) -> anyhow::Result<Transaction<'_>> {
        self.conn
            .transaction()
            .context("failed to start sqlite transaction")
    }
}

fn migrations() -> Migrations<'static> {
    Migrations::new(vec![M::up(
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
    )])
}

fn timestamp_now() -> anyhow::Result<String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .context("failed to format timestamp")
}

fn create_id() -> String {
    Uuid::now_v7().to_string()
}

fn note_exists(conn: &Connection, note_id: &str) -> anyhow::Result<bool> {
    let exists = conn
        .query_row(
            "SELECT 1 FROM notes WHERE id = ?1 LIMIT 1",
            params![note_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .context("failed to check note existence")?
        .is_some();

    Ok(exists)
}

fn note_exists_in_tx(tx: &Transaction<'_>, note_id: &str) -> anyhow::Result<bool> {
    let exists = tx
        .query_row(
            "SELECT 1 FROM notes WHERE id = ?1 LIMIT 1",
            params![note_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .context("failed to check note existence")?
        .is_some();

    Ok(exists)
}

fn get_meta_value(conn: &Connection, key: &str) -> anyhow::Result<Option<String>> {
    conn.query_row(
        "SELECT value FROM app_meta WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .optional()
    .context("failed to query app meta value")
}

fn set_meta_value(tx: &Transaction<'_>, key: &str, value: &str) -> anyhow::Result<()> {
    tx.execute(
        "
        INSERT INTO app_meta (key, value)
        VALUES (?1, ?2)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        ",
        params![key, value],
    )
    .context("failed to upsert app meta value")?;

    Ok(())
}

fn next_block_position(tx: &Transaction<'_>, note_id: &str) -> anyhow::Result<i64> {
    tx.query_row(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM note_blocks WHERE note_id = ?1",
        params![note_id],
        |row| row.get(0),
    )
    .context("failed to compute next block position")
}

fn count_note_blocks(tx: &Transaction<'_>, note_id: &str) -> anyhow::Result<i64> {
    tx.query_row(
        "SELECT COUNT(*) FROM note_blocks WHERE note_id = ?1",
        params![note_id],
        |row| row.get(0),
    )
    .context("failed to count note blocks")
}

fn touch_note(tx: &Transaction<'_>, note_id: &str, now: &str) -> anyhow::Result<()> {
    tx.execute(
        "UPDATE notes SET updated_at = ?2 WHERE id = ?1",
        params![note_id, now],
    )
    .context("failed to update note timestamp")?;
    Ok(())
}

fn get_block_note_id(tx: &Transaction<'_>, block_id: &str) -> anyhow::Result<Option<String>> {
    tx.query_row(
        "SELECT note_id FROM note_blocks WHERE id = ?1",
        params![block_id],
        |row| row.get(0),
    )
    .optional()
    .context("failed to query block note id")
}

struct BlockMeta {
    note_id: String,
    position: i64,
}

fn get_block_meta(tx: &Transaction<'_>, block_id: &str) -> anyhow::Result<Option<BlockMeta>> {
    tx.query_row(
        "SELECT note_id, position FROM note_blocks WHERE id = ?1",
        params![block_id],
        |row| {
            Ok(BlockMeta {
                note_id: row.get(0)?,
                position: row.get(1)?,
            })
        },
    )
    .optional()
    .context("failed to query block metadata")
}

fn get_block_by_id(tx: &Transaction<'_>, block_id: &str) -> anyhow::Result<Option<NoteBlock>> {
    tx.query_row(
        "SELECT id, note_id, position, content, created_at, updated_at
         FROM note_blocks
         WHERE id = ?1",
        params![block_id],
        map_note_block,
    )
    .optional()
    .context("failed to query note block by id")
}

fn map_note_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<NoteSummary> {
    Ok(NoteSummary {
        id: row.get(0)?,
        title: row.get(1)?,
        created_at: row.get(2)?,
        updated_at: row.get(3)?,
    })
}

fn map_note_block(row: &rusqlite::Row<'_>) -> rusqlite::Result<NoteBlock> {
    Ok(NoteBlock {
        id: row.get(0)?,
        note_id: row.get(1)?,
        position: row.get(2)?,
        content: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}
