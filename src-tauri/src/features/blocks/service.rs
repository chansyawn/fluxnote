use std::collections::HashSet;

use anyhow::{anyhow, Context};
use rusqlite::{params, Connection, OptionalExtension, ToSql, Transaction};

use crate::error::{AppResult, BusinessError};
use crate::features::blocks::BlockVisibility;
use crate::features::tags;

use super::models::{Block, DeleteBlockResult};

pub fn list_blocks(
    conn: &Connection,
    tag_ids: &[String],
    visibility: BlockVisibility,
) -> AppResult<Vec<Block>> {
    let blocks = if tag_ids.is_empty() {
        list_all_blocks(conn, visibility)?
    } else {
        list_blocks_by_tag_ids(conn, tag_ids, visibility)?
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

pub fn archive_block(conn: &mut Connection, block_id: &str) -> AppResult<Block> {
    set_block_archive_state(conn, block_id, true)
}

pub fn restore_block(conn: &mut Connection, block_id: &str) -> AppResult<Block> {
    set_block_archive_state(conn, block_id, false)
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

pub fn list_stale_active_block_ids(conn: &Connection, cutoff: &str) -> AppResult<HashSet<String>> {
    let mut statement = conn
        .prepare(
            "SELECT id
             FROM blocks
             WHERE archived_at IS NULL
               AND updated_at <= ?1",
        )
        .context("failed to prepare stale block query")?;

    let rows = statement
        .query_map(params![cutoff], |row| row.get::<_, String>(0))
        .context("failed to query stale blocks")?;

    rows.collect::<rusqlite::Result<HashSet<_>>>()
        .context("failed to materialize stale block ids")
        .map_err(Into::into)
}

pub fn archive_blocks_without_touching_updated_at(
    conn: &mut Connection,
    block_ids: &HashSet<String>,
) -> AppResult<usize> {
    if block_ids.is_empty() {
        return Ok(0);
    }

    let now = crate::features::tags::service::timestamp_now()?;
    let placeholders = std::iter::repeat_n("?", block_ids.len())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "UPDATE blocks
         SET archived_at = ?
         WHERE archived_at IS NULL
           AND id IN ({placeholders})"
    );
    let tx = begin_tx(conn)?;
    let mut params = Vec::<&dyn ToSql>::with_capacity(block_ids.len() + 1);
    params.push(&now);
    for block_id in block_ids {
        params.push(block_id as &dyn ToSql);
    }

    let archived_count = tx
        .execute(&sql, params.as_slice())
        .context("failed to archive stale blocks")?;

    tx.commit()
        .context("failed to commit stale block archive transaction")?;

    Ok(archived_count)
}

pub(crate) fn get_block_by_id(
    tx: &Transaction<'_>,
    block_id: &str,
) -> anyhow::Result<Option<Block>> {
    tx.query_row(
        "SELECT id, position, content, archived_at, created_at, updated_at
         FROM blocks
         WHERE id = ?1",
        params![block_id],
        map_block,
    )
    .optional()
    .context("failed to query block by id")
}

fn list_all_blocks(conn: &Connection, visibility: BlockVisibility) -> AppResult<Vec<Block>> {
    let mut statement = conn
        .prepare(
            "SELECT id, position, content, archived_at, created_at, updated_at
             FROM blocks
             WHERE archived_at IS NULL = ?1
             ORDER BY position ASC",
        )
        .context("failed to prepare block list query")?;

    let rows = statement
        .query_map([visibility_is_active(visibility)], map_block)
        .context("failed to query blocks")?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .context("failed to materialize blocks")
        .map_err(Into::into)
}

fn list_blocks_by_tag_ids(
    conn: &Connection,
    tag_ids: &[String],
    visibility: BlockVisibility,
) -> AppResult<Vec<Block>> {
    let placeholders = std::iter::repeat_n("?", tag_ids.len())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "SELECT b.id, b.position, b.content, b.archived_at, b.created_at, b.updated_at
         FROM blocks b
         JOIN block_tags bt ON bt.block_id = b.id
         WHERE bt.tag_id IN ({placeholders})
           AND b.archived_at IS NULL = ?
         GROUP BY b.id, b.position, b.content, b.archived_at, b.created_at, b.updated_at
         HAVING COUNT(DISTINCT bt.tag_id) = ?
         ORDER BY b.position ASC"
    );

    let required_matches = tag_ids.len() as i64;
    let visibility_is_active = visibility_is_active(visibility);
    let mut params = tag_ids
        .iter()
        .map(|tag_id| tag_id as &dyn ToSql)
        .collect::<Vec<_>>();
    params.push(&visibility_is_active);
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

fn set_block_archive_state(
    conn: &mut Connection,
    block_id: &str,
    archived: bool,
) -> AppResult<Block> {
    let now = crate::features::tags::service::timestamp_now()?;
    let tx = begin_tx(conn)?;

    ensure_block_exists(&tx, block_id)?;

    tx.execute(
        "UPDATE blocks
         SET archived_at = ?2, updated_at = ?3
         WHERE id = ?1",
        params![block_id, archived.then_some(now.clone()), now],
    )
    .context("failed to update block archive state")?;

    let block = get_block_by_id(&tx, block_id)?
        .ok_or_else(|| anyhow!("updated block was not found after archive state change"))?;

    tx.commit()
        .context("failed to commit archive state transaction")?;

    Ok(block)
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
        archived_at: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
        will_archive: false,
        tags: Vec::new(),
    })
}

fn visibility_is_active(visibility: BlockVisibility) -> bool {
    matches!(visibility, BlockVisibility::Active)
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use rusqlite::params;

    use crate::{
        database::new_in_memory_connection,
        error::{AppError, BusinessError},
        features::{blocks::BlockVisibility, tags::service as tag_service},
    };

    use super::{
        archive_block, archive_blocks_without_touching_updated_at, create_block, delete_block,
        list_blocks, list_stale_active_block_ids, update_block_content,
    };

    #[test]
    fn create_block_assigns_incremental_positions() {
        let mut conn = new_in_memory_connection().expect("test db should initialize");

        let first = create_block(&mut conn).expect("first block should be created");
        let second = create_block(&mut conn).expect("second block should be created");

        assert_eq!(first.position, 0);
        assert_eq!(second.position, 1);
    }

    #[test]
    fn update_block_content_returns_not_found_for_missing_block() {
        let mut conn = new_in_memory_connection().expect("test db should initialize");

        let error = update_block_content(&mut conn, "missing-id", "content")
            .expect_err("missing block should return error");

        assert!(matches!(
            error,
            AppError::Business(BusinessError::NotFound(id)) if id == "missing-id"
        ));
    }

    #[test]
    fn delete_block_compacts_positions_after_removal() {
        let mut conn = new_in_memory_connection().expect("test db should initialize");

        let first = create_block(&mut conn).expect("first block should be created");
        let middle = create_block(&mut conn).expect("middle block should be created");
        let last = create_block(&mut conn).expect("last block should be created");

        delete_block(&mut conn, &middle.id).expect("delete should succeed");

        let blocks =
            list_blocks(&conn, &[], BlockVisibility::Active).expect("blocks should be listed");
        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].id, first.id);
        assert_eq!(blocks[0].position, 0);
        assert_eq!(blocks[1].id, last.id);
        assert_eq!(blocks[1].position, 1);
    }

    #[test]
    fn delete_block_returns_not_found_for_missing_block() {
        let mut conn = new_in_memory_connection().expect("test db should initialize");

        let error = delete_block(&mut conn, "missing-id").expect_err("missing block should fail");

        assert!(matches!(
            error,
            AppError::Business(BusinessError::NotFound(id)) if id == "missing-id"
        ));
    }

    #[test]
    fn list_blocks_filters_by_all_tag_ids() {
        let mut conn = new_in_memory_connection().expect("test db should initialize");
        let block1 = create_block(&mut conn).expect("block1 should be created");
        let block2 = create_block(&mut conn).expect("block2 should be created");
        let tag1 = tag_service::create_tag(&mut conn, "Tag A").expect("tag1 should be created");
        let tag2 = tag_service::create_tag(&mut conn, "Tag B").expect("tag2 should be created");

        tag_service::set_block_tags(&mut conn, &block1.id, &[tag1.id.clone(), tag2.id.clone()])
            .expect("block1 tags should be set");
        tag_service::set_block_tags(&mut conn, &block2.id, std::slice::from_ref(&tag1.id))
            .expect("block2 tags should be set");

        let by_tag1 = list_blocks(
            &conn,
            std::slice::from_ref(&tag1.id),
            BlockVisibility::Active,
        )
        .expect("tag filtered list should succeed");
        assert_eq!(by_tag1.len(), 2);

        let by_both = list_blocks(
            &conn,
            &[tag1.id.clone(), tag2.id.clone()],
            BlockVisibility::Active,
        )
        .expect("all-tags filtered list should succeed");
        assert_eq!(by_both.len(), 1);
        assert_eq!(by_both[0].id, block1.id);
    }

    #[test]
    fn archive_blocks_without_touching_updated_at_preserves_timestamp() {
        let mut conn = new_in_memory_connection().expect("test db should initialize");
        let block = create_block(&mut conn).expect("block should be created");
        let updated = update_block_content(&mut conn, &block.id, "hello")
            .expect("content update should succeed");
        let before = updated.updated_at.clone();

        let archived_count = archive_blocks_without_touching_updated_at(
            &mut conn,
            &HashSet::from([block.id.clone()]),
        )
        .expect("archive should succeed");

        assert_eq!(archived_count, 1);
        let archived = list_blocks(&conn, &[], BlockVisibility::Archived)
            .expect("archived blocks should list");
        assert_eq!(archived.len(), 1);
        assert!(archived[0].archived_at.is_some());
        assert_eq!(archived[0].updated_at, before);
    }

    #[test]
    fn list_stale_active_block_ids_excludes_archived_blocks() {
        let mut conn = new_in_memory_connection().expect("test db should initialize");
        let active = create_block(&mut conn).expect("active block should be created");
        let archived = create_block(&mut conn).expect("archived block should be created");

        conn.execute(
            "UPDATE blocks SET updated_at = ?2 WHERE id = ?1",
            params![active.id, "2020-01-01T00:00:00Z"],
        )
        .expect("active block updated_at should be set");
        conn.execute(
            "UPDATE blocks SET updated_at = ?2 WHERE id = ?1",
            params![archived.id, "2020-01-01T00:00:00Z"],
        )
        .expect("archived block updated_at should be set");
        archive_block(&mut conn, &archived.id).expect("archived block should be archived");

        let stale_ids = list_stale_active_block_ids(&conn, "2021-01-01T00:00:00Z")
            .expect("stale block ids should be listed");
        assert!(stale_ids.contains(&active.id));
        assert!(!stale_ids.contains(&archived.id));
    }
}
