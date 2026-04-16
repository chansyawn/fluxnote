use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, Manager, PhysicalSize};

// Global position storage (in-memory)
static WINDOW_POSITIONS: Mutex<Option<HashMap<String, (f64, f64)>>> = Mutex::new(None);

fn get_monitor_key(monitor: &tauri::Monitor) -> String {
    format!(
        "{}_{}_{}_{}",
        monitor.position().x,
        monitor.position().y,
        monitor.size().width,
        monitor.size().height
    )
}

fn save_window_position(app: &AppHandle, window_label: &str) -> tauri::Result<()> {
    let window = app
        .get_webview_window(window_label)
        .ok_or_else(|| tauri::Error::WindowNotFound)?;

    let position = window.outer_position()?;
    let monitor = window.current_monitor()?.ok_or_else(|| {
        tauri::Error::Anyhow(anyhow::anyhow!("Failed to get current monitor"))
    })?;

    let key = get_monitor_key(&monitor);
    let scale = monitor.scale_factor();

    let mut positions = WINDOW_POSITIONS.lock().unwrap();
    if positions.is_none() {
        *positions = Some(HashMap::new());
    }

    positions.as_mut().unwrap().insert(
        key,
        (position.x as f64 / scale, position.y as f64 / scale),
    );

    Ok(())
}

fn show_on_cursor_monitor(app: &AppHandle, window_label: &str) -> tauri::Result<()> {
    let window = app
        .get_webview_window(window_label)
        .ok_or_else(|| tauri::Error::WindowNotFound)?;

    // Get cursor position and find monitor
    let cursor = window.cursor_position()?;
    let monitors = window.available_monitors()?;

    let monitor = monitors
        .iter()
        .find(|m| {
            let pos = m.position();
            let size = m.size();
            cursor.x >= pos.x as f64
                && cursor.x < (pos.x + size.width as i32) as f64
                && cursor.y >= pos.y as f64
                && cursor.y < (pos.y + size.height as i32) as f64
        })
        .ok_or_else(|| {
            tauri::Error::Anyhow(anyhow::anyhow!("Failed to find monitor at cursor position"))
        })?;

    let key = get_monitor_key(monitor);
    let scale = monitor.scale_factor();
    let window_size = window.outer_size()?;

    // Get saved position or calculate centered position
    let positions = WINDOW_POSITIONS.lock().unwrap();
    let (x, y) = if let Some(pos_map) = positions.as_ref() {
        if let Some(&(saved_x, saved_y)) = pos_map.get(&key) {
            (saved_x, saved_y)
        } else {
            calculate_centered_position(monitor, &window_size, scale)
        }
    } else {
        calculate_centered_position(monitor, &window_size, scale)
    };

    window.set_position(LogicalPosition::new(x, y))?;
    window.unminimize()?;
    window.show()?;
    window.set_focus()?;

    Ok(())
}

fn calculate_centered_position(
    monitor: &tauri::Monitor,
    window_size: &PhysicalSize<u32>,
    scale: f64,
) -> (f64, f64) {
    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let win_w = window_size.width as f64 / scale;
    let win_h = window_size.height as f64 / scale;

    let x = mon_pos.x as f64 / scale + (mon_size.width as f64 / scale - win_w) / 2.0;
    let y = mon_pos.y as f64 / scale + (mon_size.height as f64 / scale - win_h) / 2.0;

    (x, y)
}

pub fn show_main_window(app: &AppHandle, window_label: &str) -> tauri::Result<()> {
    let window = app
        .get_webview_window(window_label)
        .ok_or_else(|| tauri::Error::WindowNotFound)?;

    window.unminimize()?;
    window.show()?;
    window.set_focus()?;

    Ok(())
}

pub fn toggle_main_window(app: &AppHandle, window_label: &str) -> tauri::Result<()> {
    let window = app
        .get_webview_window(window_label)
        .ok_or_else(|| tauri::Error::WindowNotFound)?;

    if window.is_visible()? {
        save_window_position(app, window_label)?;
        window.hide()?;
    } else {
        show_on_cursor_monitor(app, window_label)?;
    }

    Ok(())
}

#[tauri::command]
pub fn toggle_main_window_command(app: AppHandle) -> Result<(), String> {
    toggle_main_window(&app, crate::MAIN_WINDOW_LABEL).map_err(|e| e.to_string())
}
