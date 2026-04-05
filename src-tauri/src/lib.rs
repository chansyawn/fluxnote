use tauri::Manager;

mod error;
mod features;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_tracing();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let note_state = features::note::init_note_state(app.handle())?;
            app.manage(note_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            features::sample::greet,
            features::note::get_home_note,
            features::note::create_note_block,
            features::note::update_note_block_content,
            features::note::delete_note_block
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
