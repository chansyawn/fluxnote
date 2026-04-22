use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use interprocess::local_socket::{
    traits::tokio::{Listener, Stream as StreamTrait},
    GenericFilePath, ListenerOptions, ToFsName,
};
use tauri::AppHandle;
use tokio::io::AsyncReadExt;
use tracing::{error, info};

use super::{env, protocol::IpcMessage};

const MAX_MESSAGE_SIZE: usize = 64 * 1024;

pub fn start_ipc_server(app: AppHandle) -> Result<()> {
    if !env::is_dev_mode() {
        return Ok(());
    }

    let socket_path = env::get_socket_path();
    info!(?socket_path, "Starting IPC server");

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("Failed to build tokio runtime for IPC server");

        rt.block_on(async move {
            if let Err(e) = run_server(app, socket_path).await {
                error!(?e, "IPC server error");
            }
        });
    });

    Ok(())
}

async fn run_server(app: AppHandle, socket_path: PathBuf) -> Result<()> {
    prepare_socket_path(&socket_path).await?;

    let name = socket_path
        .as_path()
        .to_fs_name::<GenericFilePath>()
        .context("Failed to create IPC endpoint name")?;

    let opts = ListenerOptions::new().name(name);
    let listener = opts
        .create_tokio()
        .context("Failed to create IPC listener")?;

    info!("IPC server listening");

    loop {
        match listener.accept().await {
            Ok(mut stream) => {
                let app = app.clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_connection(&mut stream, &app).await {
                        error!(?e, "Failed to handle connection");
                    }
                });
            }
            Err(e) => {
                error!(?e, "Failed to accept connection");
            }
        }
    }
}

async fn handle_connection(
    stream: &mut interprocess::local_socket::tokio::Stream,
    app: &AppHandle,
) -> Result<()> {
    let mut buffer = Vec::with_capacity(1024);
    let mut temp_buf = [0u8; 1024];

    loop {
        let n = stream.read(&mut temp_buf).await?;
        if n == 0 {
            break;
        }

        buffer.extend_from_slice(&temp_buf[..n]);

        if buffer.len() > MAX_MESSAGE_SIZE {
            anyhow::bail!("Message exceeds maximum size of {} bytes", MAX_MESSAGE_SIZE);
        }
    }

    let message_str = String::from_utf8(buffer).context("Invalid UTF-8")?;
    let message = IpcMessage::from_json(&message_str)?;

    info!(?message, "Received IPC message");

    match message {
        IpcMessage::DeepLink { url } => {
            if let Err(e) = crate::features::deep_link::handle_deep_link_url(app, &url) {
                error!(?e, ?url, "Failed to handle deep link");
            }
        }
    }

    Ok(())
}

#[cfg(unix)]
async fn prepare_socket_path(socket_path: &Path) -> Result<()> {
    use std::io::ErrorKind;
    use std::os::unix::fs::FileTypeExt;

    if !socket_path.try_exists().with_context(|| {
        format!(
            "Failed to inspect IPC socket path: {}",
            socket_path.display()
        )
    })? {
        return Ok(());
    }

    let metadata = std::fs::symlink_metadata(socket_path).with_context(|| {
        format!(
            "Failed to inspect existing IPC endpoint at {}",
            socket_path.display()
        )
    })?;

    if !metadata.file_type().is_socket() {
        anyhow::bail!(
            "IPC endpoint path exists but is not a socket: {}",
            socket_path.display()
        );
    }

    let name = socket_path
        .to_fs_name::<GenericFilePath>()
        .context("Failed to create IPC endpoint name")?;

    match interprocess::local_socket::tokio::Stream::connect(name).await {
        Ok(_) => anyhow::bail!(
            "IPC endpoint is already in use by another FluxNote dev instance: {}",
            socket_path.display()
        ),
        Err(error)
            if matches!(
                error.kind(),
                ErrorKind::ConnectionRefused | ErrorKind::NotFound
            ) =>
        {
            std::fs::remove_file(socket_path).with_context(|| {
                format!(
                    "Failed to remove stale IPC socket: {}",
                    socket_path.display()
                )
            })?;
            info!(?socket_path, "Removed stale IPC socket");
            Ok(())
        }
        Err(error) => Err(error).with_context(|| {
            format!(
                "IPC endpoint exists but could not be reclaimed: {}",
                socket_path.display()
            )
        }),
    }
}

#[cfg(not(unix))]
async fn prepare_socket_path(_socket_path: &Path) -> Result<()> {
    Ok(())
}
