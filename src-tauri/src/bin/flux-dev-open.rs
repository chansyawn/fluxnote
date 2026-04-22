use anyhow::{Context, Result};
use fluxnote_lib::dev::{client, protocol::IpcMessage};

fn main() {
    if let Err(e) = run() {
        eprintln!("Error: {:#}", e);
        std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let url = std::env::args()
        .nth(1)
        .context("Usage: flux-dev-open <url>")?;

    let message = IpcMessage::DeepLink { url };
    client::send_message_blocking(&message)
        .context("Failed to send IPC message. Is the GUI running with `pnpm tauri dev`?")?;

    println!("✓ Sent deep link");
    Ok(())
}
