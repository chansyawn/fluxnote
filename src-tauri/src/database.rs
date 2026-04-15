mod migrations;

use std::{fs, sync::Mutex, time::Duration};

use anyhow::Context;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::error::{AppResult, BusinessError};

const DATABASE_FILE_NAME: &str = "fluxnote.sqlite3";

pub struct DatabaseState {
    conn: Mutex<Connection>,
}

impl DatabaseState {
    pub fn init(app: &AppHandle) -> anyhow::Result<Self> {
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

        migrations::apply(&mut conn).context("failed to apply sqlite migrations")?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn lock(&self) -> AppResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(|_| {
            BusinessError::InternalState("Database state lock poisoned".to_string()).into()
        })
    }
}

/// Initialize a database connection for CLI usage
pub fn init_cli_connection(path: &std::path::Path) -> anyhow::Result<Connection> {
    let mut conn = Connection::open(path)
        .with_context(|| format!("failed to open database: {}", path.display()))?;

    conn.busy_timeout(Duration::from_secs(5))
        .context("failed to set sqlite busy timeout")?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .context("failed to enable sqlite foreign keys")?;

    migrations::apply(&mut conn).context("failed to apply sqlite migrations")?;

    Ok(conn)
}

#[cfg(test)]
pub(crate) fn new_in_memory_connection() -> anyhow::Result<Connection> {
    let mut conn = Connection::open_in_memory().context("failed to open in-memory sqlite db")?;

    conn.busy_timeout(Duration::from_secs(5))
        .context("failed to set sqlite busy timeout for test db")?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .context("failed to enable sqlite foreign keys for test db")?;
    migrations::apply(&mut conn).context("failed to apply sqlite migrations for test db")?;

    Ok(conn)
}
