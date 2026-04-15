// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 检测是否为 CLI 模式
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        // CLI 模式
        fluxnote_lib::cli::run();
        return;
    }

    // GUI 模式
    fluxnote_lib::run()
}
