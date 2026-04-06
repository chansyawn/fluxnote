use tauri::{
    menu::MenuBuilder,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, RunEvent,
};

mod error;
mod features;

const MAIN_WINDOW_LABEL: &str = "main";
const SHOW_MAIN_MENU_ID: &str = "show-main";
const QUIT_APP_MENU_ID: &str = "quit-app";

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
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let note_state = features::note::init_note_state(app.handle())?;
            app.manage(note_state);
            #[cfg(target_os = "macos")]
            app.handle().set_dock_visibility(false)?;
            build_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            features::sample::greet,
            features::note::get_home_note,
            features::note::create_note_block,
            features::note::update_note_block_content,
            features::note::delete_note_block
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
