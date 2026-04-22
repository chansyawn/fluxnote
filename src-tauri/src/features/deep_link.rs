use anyhow::{Context, Result};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use tracing::{error, info};

const DEEP_LINK_EVENT: &str = "deep-link://open-block";

#[derive(Debug, Clone, Serialize)]
struct DeepLinkPayload {
    #[serde(rename = "blockId")]
    block_id: String,
}

/// Setup deep link handler to listen for incoming URLs
pub fn setup_deep_link_handler(app: &AppHandle) -> Result<()> {
    let app_handle = app.clone();

    // Listen for deep link events while app is running
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            let url_str = url.as_str();
            info!(?url_str, "Received deep link URL");

            if let Err(e) = handle_deep_link_url(&app_handle, url_str) {
                error!(?e, ?url_str, "Failed to handle deep link URL");
            }
        }
    });

    info!("Deep link handler registered");
    Ok(())
}

/// Check for initial deep link URL when app starts
pub fn check_initial_deep_link(app: &AppHandle) -> Result<()> {
    // Check if app was started via deep link
    if let Some(urls) = app.deep_link().get_current()? {
        info!(?urls, "Found initial deep link URLs");

        for url in urls {
            let url_str = url.as_str();
            info!(?url_str, "Processing initial deep link URL");

            if let Err(e) = handle_deep_link_url(app, url_str) {
                error!(?e, ?url_str, "Failed to handle initial deep link URL");
            }
        }
    }

    Ok(())
}

/// Handle deep link URL - can be called from URL schema or IPC
pub fn handle_deep_link_url(app: &AppHandle, url: &str) -> Result<()> {
    let block_id = parse_block_url(url)?;
    info!(?block_id, "Parsed block ID from deep link");

    show_main_window(app)?;

    let payload = DeepLinkPayload { block_id };
    app.emit(DEEP_LINK_EVENT, payload)?;

    info!("Deep link handled successfully");
    Ok(())
}

/// Parse block URL in format: fluxnote://block/{block_id}
fn parse_block_url(url: &str) -> Result<String> {
    let url = url.trim();

    // Remove trailing slash if present
    let url = url.trim_end_matches('/');

    // Expected format: fluxnote://block/{block_id}
    let prefix = "fluxnote://block/";

    if !url.starts_with(prefix) {
        anyhow::bail!("Invalid deep link URL format. Expected: fluxnote://block/{{block_id}}");
    }

    let block_id = url
        .strip_prefix(prefix)
        .context("Failed to extract block ID")?;

    if block_id.is_empty() {
        anyhow::bail!("Block ID is empty");
    }

    Ok(block_id.to_string())
}

/// Show and focus the main window
fn show_main_window(app: &AppHandle) -> Result<()> {
    let window = app
        .get_webview_window(crate::MAIN_WINDOW_LABEL)
        .context("Main window not found")?;

    window.unminimize()?;
    window.show()?;
    window.set_focus()?;

    info!("Main window shown and focused");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_block_url_valid() {
        let url = "fluxnote://block/01JQWXYZ123456789";
        let result = parse_block_url(url);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "01JQWXYZ123456789");
    }

    #[test]
    fn test_parse_block_url_with_trailing_slash() {
        let url = "fluxnote://block/01JQWXYZ123456789/";
        let result = parse_block_url(url);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "01JQWXYZ123456789");
    }

    #[test]
    fn test_parse_block_url_invalid_scheme() {
        let url = "https://block/01JQWXYZ123456789";
        let result = parse_block_url(url);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_block_url_invalid_path() {
        let url = "fluxnote://invalid/01JQWXYZ123456789";
        let result = parse_block_url(url);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_block_url_empty_block_id() {
        let url = "fluxnote://block/";
        let result = parse_block_url(url);
        assert!(result.is_err());
    }
}
