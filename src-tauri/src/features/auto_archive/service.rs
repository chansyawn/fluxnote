use std::{collections::HashSet, time::Duration};

use anyhow::Context;
use serde::Serialize;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_store::StoreExt;
use time::OffsetDateTime;

use crate::{
    database::DatabaseState,
    error::AppResult,
    features::{
        auto_archive::AutoArchiveState, blocks::service as block_service,
        tags::service::timestamp_now,
    },
};

const PREFERENCES_FILE_NAME: &str = "preferences.json";
const AUTO_ARCHIVE_ENABLED_KEY: &str = "autoArchiveEnabled";
const AUTO_ARCHIVE_IDLE_MINUTES_KEY: &str = "autoArchiveIdleMinutes";
const AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS_KEY: &str = "autoArchiveScanIntervalSeconds";
const DEFAULT_AUTO_ARCHIVE_ENABLED: bool = true;
const DEFAULT_AUTO_ARCHIVE_IDLE_MINUTES: i64 = 7 * 24 * 60;
const DEFAULT_AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS: u64 = 300;
const MIN_SCAN_INTERVAL_SECONDS: u64 = 30;
const VISIBILITY_POLL_INTERVAL_SECONDS: u64 = 1;
const AUTO_ARCHIVE_STATE_CHANGED_EVENT: &str = "auto-archive://state-changed";

#[derive(Debug, Clone, Copy)]
pub struct AutoArchiveConfig {
    pub enabled: bool,
    pub idle_minutes: i64,
    pub scan_interval_seconds: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoArchiveEventPayload {
    pub archived_count: usize,
    pub pending_count: usize,
    pub window_visible: bool,
}

pub fn init_store<R: Runtime>(app: &AppHandle<R>) -> anyhow::Result<()> {
    let store = app
        .store_builder(PREFERENCES_FILE_NAME)
        .default(AUTO_ARCHIVE_ENABLED_KEY, DEFAULT_AUTO_ARCHIVE_ENABLED)
        .default(
            AUTO_ARCHIVE_IDLE_MINUTES_KEY,
            DEFAULT_AUTO_ARCHIVE_IDLE_MINUTES,
        )
        .default(
            AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS_KEY,
            DEFAULT_AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS,
        )
        .build()
        .context("failed to initialize preferences store")?;

    store
        .save()
        .context("failed to persist default preferences store")?;

    Ok(())
}

pub fn spawn_runtime<R: Runtime>(app: AppHandle<R>) {
    let scan_app = app.clone();
    std::thread::spawn(move || loop {
        if let Err(error) = sync_runtime_state(&scan_app, false) {
            tracing::error!(?error, "auto archive scan failed");
        }

        let sleep_seconds = read_config(&scan_app)
            .map(|config| config.scan_interval_seconds.max(MIN_SCAN_INTERVAL_SECONDS))
            .unwrap_or(DEFAULT_AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS);
        std::thread::sleep(Duration::from_secs(sleep_seconds));
    });

    std::thread::spawn(move || {
        let mut last_visible = current_window_visible(&app).unwrap_or(true);

        loop {
            std::thread::sleep(Duration::from_secs(VISIBILITY_POLL_INTERVAL_SECONDS));

            let current_visible = match current_window_visible(&app) {
                Ok(value) => value,
                Err(error) => {
                    tracing::error!(?error, "failed to poll window visibility");
                    continue;
                }
            };

            if last_visible && !current_visible {
                if let Err(error) = sync_runtime_state(&app, true) {
                    tracing::error!(?error, "auto archive hide transition sync failed");
                }
            } else if !last_visible && current_visible {
                if let Err(error) = sync_runtime_state(&app, false) {
                    tracing::error!(?error, "auto archive show transition sync failed");
                }
            }

            last_visible = current_visible;
        }
    });
}

pub fn sync_runtime_state<R: Runtime>(
    app: &AppHandle<R>,
    force_archive_when_hidden: bool,
) -> AppResult<()> {
    let config = read_config(app)?;
    let window_visible = current_window_visible(app)?;
    let state = app.state::<AutoArchiveState>();
    let last_scan_at = timestamp_now()?;

    if !config.enabled {
        let should_emit = state.clear(last_scan_at.clone(), window_visible);

        if should_emit {
            emit_state_changed(
                app,
                AutoArchiveEventPayload {
                    archived_count: 0,
                    pending_count: 0,
                    window_visible,
                },
            )?;
        }

        return Ok(());
    }

    let cutoff = (OffsetDateTime::now_utc() - time::Duration::minutes(config.idle_minutes))
        .format(&time::format_description::well_known::Rfc3339)
        .context("failed to format auto archive cutoff time")?;

    let database_state = app.state::<DatabaseState>();
    let stale_block_ids = {
        let conn = database_state.lock()?;
        block_service::list_stale_active_block_ids(&conn, &cutoff)?
    };

    let archived_count = if window_visible {
        0
    } else {
        let should_archive = force_archive_when_hidden || !stale_block_ids.is_empty();

        if !should_archive {
            0
        } else {
            let mut conn = database_state.lock()?;
            block_service::archive_blocks_without_touching_updated_at(&mut conn, &stale_block_ids)?
        }
    };

    let pending_archive_block_ids = if window_visible {
        stale_block_ids
    } else {
        HashSet::new()
    };
    let should_emit = state.update(
        pending_archive_block_ids.clone(),
        last_scan_at,
        window_visible,
    );

    if should_emit || archived_count > 0 {
        emit_state_changed(
            app,
            AutoArchiveEventPayload {
                archived_count,
                pending_count: pending_archive_block_ids.len(),
                window_visible,
            },
        )?;
    }

    Ok(())
}

pub fn read_config<R: Runtime>(app: &AppHandle<R>) -> AppResult<AutoArchiveConfig> {
    let store = app
        .store_builder(PREFERENCES_FILE_NAME)
        .default(AUTO_ARCHIVE_ENABLED_KEY, DEFAULT_AUTO_ARCHIVE_ENABLED)
        .default(
            AUTO_ARCHIVE_IDLE_MINUTES_KEY,
            DEFAULT_AUTO_ARCHIVE_IDLE_MINUTES,
        )
        .default(
            AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS_KEY,
            DEFAULT_AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS,
        )
        .build()
        .context("failed to load preferences store")?;

    store
        .reload()
        .context("failed to reload preferences store from disk")?;

    let enabled = store
        .get(AUTO_ARCHIVE_ENABLED_KEY)
        .and_then(|value| value.as_bool())
        .unwrap_or(DEFAULT_AUTO_ARCHIVE_ENABLED);
    let idle_minutes = store
        .get(AUTO_ARCHIVE_IDLE_MINUTES_KEY)
        .and_then(|value| value.as_i64())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_AUTO_ARCHIVE_IDLE_MINUTES);
    let scan_interval_seconds = store
        .get(AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS_KEY)
        .and_then(|value| value.as_u64())
        .filter(|value| *value > 0)
        .unwrap_or(DEFAULT_AUTO_ARCHIVE_SCAN_INTERVAL_SECONDS);

    Ok(AutoArchiveConfig {
        enabled,
        idle_minutes,
        scan_interval_seconds,
    })
}

fn current_window_visible<R: Runtime>(app: &AppHandle<R>) -> AppResult<bool> {
    let Some(window) = app.get_webview_window(crate::MAIN_WINDOW_LABEL) else {
        return Ok(true);
    };

    window
        .is_visible()
        .map_err(anyhow::Error::from)
        .map_err(Into::into)
}

fn emit_state_changed<R: Runtime>(
    app: &AppHandle<R>,
    payload: AutoArchiveEventPayload,
) -> AppResult<()> {
    app.emit(AUTO_ARCHIVE_STATE_CHANGED_EVENT, payload)
        .with_context(|| {
            let debug_payload = json!({ "event": AUTO_ARCHIVE_STATE_CHANGED_EVENT });
            format!("failed to emit auto archive state changed event: {debug_payload}")
        })?;

    Ok(())
}
