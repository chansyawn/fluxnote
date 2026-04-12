use anyhow::{anyhow, Context};
use rusqlite::{params, Connection, OptionalExtension, ToSql, Transaction};

use crate::error::{AppResult, BusinessError};
use crate::features::tags;

use super::models::{Block, DeleteBlockResult};

pub fn list_blocks(conn: &Connection, tag_ids: &[String]) -> AppResult<Vec<Block>> {
    let blocks = if tag_ids.is_empty() {
        list_all_blocks(conn)?
    } else {
        list_blocks_by_tag_ids(conn, tag_ids)?
    };

    attach_tags(conn, blocks)
}

pub fn create_block(conn: &mut Connection) -> AppResult<Block> {
    let now = crate::features::tags::service::timestamp_now()?;
    let block_id = crate::features::tags::service::create_id();
    let tx = begin_tx(conn)?;
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

pub fn update_block_content(
    conn: &mut Connection,
    block_id: &str,
    content: &str,
) -> AppResult<Block> {
    let now = crate::features::tags::service::timestamp_now()?;
    let tx = begin_tx(conn)?;

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

pub fn delete_block(conn: &mut Connection, block_id: &str) -> AppResult<DeleteBlockResult> {
    let tx = begin_tx(conn)?;
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

pub(crate) fn attach_tags(conn: &Connection, blocks: Vec<Block>) -> AppResult<Vec<Block>> {
    if blocks.is_empty() {
        return Ok(blocks);
    }

    let block_ids = blocks
        .iter()
        .map(|block| block.id.clone())
        .collect::<Vec<_>>();
    let tags_by_block_id = tags::service::list_tags_for_block_ids(conn, &block_ids)?;

    Ok(blocks
        .into_iter()
        .map(|mut block| {
            block.tags = tags_by_block_id.get(&block.id).cloned().unwrap_or_default();
            block
        })
        .collect())
}

pub(crate) fn get_block_by_id(
    tx: &Transaction<'_>,
    block_id: &str,
) -> anyhow::Result<Option<Block>> {
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

fn list_all_blocks(conn: &Connection) -> AppResult<Vec<Block>> {
    let mut statement = conn
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

fn list_blocks_by_tag_ids(conn: &Connection, tag_ids: &[String]) -> AppResult<Vec<Block>> {
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

    let required_matches = tag_ids.len() as i64;
    let mut params = tag_ids
        .iter()
        .map(|tag_id| tag_id as &dyn ToSql)
        .collect::<Vec<_>>();
    params.push(&required_matches);

    let mut statement = conn
        .prepare(&sql)
        .context("failed to prepare filtered block list query")?;
    let rows = statement
        .query_map(params.as_slice(), map_block)
        .context("failed to query filtered blocks")?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .context("failed to materialize filtered blocks")
        .map_err(Into::into)
}

fn begin_tx(conn: &mut Connection) -> anyhow::Result<Transaction<'_>> {
    conn.transaction()
        .context("failed to start sqlite transaction")
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
