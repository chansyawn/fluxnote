use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, RunEvent,
};
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

mod database;
mod error;
mod features;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";
const SHOW_MAIN_MENU_ID: &str = "show-main";
const QUIT_APP_MENU_ID: &str = "quit-app";
const MAIN_WINDOW_RADIUS_PX: f64 = 14.0;

fn init_tracing() {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    if let Err(error) = tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_writer(std::io::stderr)
        .try_init()
    {
        eprintln!("tracing subscriber already initialized or unavailable: {error}");
    }
}

fn show_main_window(app: &AppHandle) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };

    window.unminimize()?;
    window.show()?;
    window.set_focus()?;

    Ok(())
}

fn configure_main_window(app: &AppHandle) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };

    #[cfg(target_os = "macos")]
    apply_vibrancy(
        &window,
        NSVisualEffectMaterial::UnderWindowBackground,
        Some(NSVisualEffectState::Active),
        Some(MAIN_WINDOW_RADIUS_PX),
    )
    .map_err(anyhow::Error::from)?;

    Ok(())
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let tray_menu = MenuBuilder::new(app)
        .text(SHOW_MAIN_MENU_ID, "Show FluxNote")
        .separator()
        .text(QUIT_APP_MENU_ID, "Quit")
        .build()?;

    let mut tray_builder = TrayIconBuilder::with_id("main-tray")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .tooltip("FluxNote");

    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }

    tray_builder
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_MAIN_MENU_ID => {
                if let Err(error) = show_main_window(app) {
                    tracing::error!(?error, "failed to show main window from tray menu");
                }
            }
            QUIT_APP_MENU_ID => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            #[cfg(not(target_os = "linux"))]
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Err(error) = show_main_window(tray.app_handle()) {
                    tracing::error!(?error, "failed to show main window from tray icon click");
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let database_state = database::DatabaseState::init(app.handle())?;
            app.manage(database_state);
            let auto_archive_state = features::auto_archive::AutoArchiveState::default();
            app.manage(auto_archive_state);
            features::auto_archive::service::init_store(app.handle())?;
            configure_main_window(app.handle())?;
            #[cfg(target_os = "macos")]
            app.handle().set_dock_visibility(false)?;
            build_tray(app.handle())?;
            features::auto_archive::service::spawn_runtime(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            features::sample::greet,
            features::blocks::blocks_list,
            features::blocks::blocks_create,
            features::blocks::blocks_update_content,
            features::blocks::blocks_delete,
            features::blocks::blocks_archive,
            features::blocks::blocks_restore,
            features::tags::tags_list,
            features::tags::tags_create,
            features::tags::tags_delete,
            features::tags::tags_set_block_tags
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if let RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } = event
        {
            if let Err(error) = show_main_window(app) {
                tracing::error!(?error, "failed to show main window on macOS reopen");
            }
        }
    });
}
