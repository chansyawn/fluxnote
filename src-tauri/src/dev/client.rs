use anyhow::{Context, Result};
use interprocess::local_socket::{traits::tokio::Stream as StreamTrait, GenericFilePath, ToFsName};
use tokio::io::AsyncWriteExt;
use tracing::info;

use super::{env, protocol::IpcMessage};

pub async fn send_message(message: &IpcMessage) -> Result<()> {
    let socket_path = env::get_socket_path();
    info!(?socket_path, ?message, "Sending IPC message");

    let name = socket_path
        .to_fs_name::<GenericFilePath>()
        .context("Failed to create IPC endpoint name")?;

    let mut stream = interprocess::local_socket::tokio::Stream::connect(name)
        .await
        .context("Failed to connect to IPC server")?;

    let json = message.to_json()?;
    stream
        .write_all(json.as_bytes())
        .await
        .context("Failed to write message")?;

    stream.flush().await.context("Failed to flush stream")?;

    info!("IPC message sent successfully");
    Ok(())
}

pub fn send_message_blocking(message: &IpcMessage) -> Result<()> {
    tokio::runtime::Runtime::new()?.block_on(send_message(message))
}
