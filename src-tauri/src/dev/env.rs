use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

const APP_IDENTIFIER: &str = "app.fluxnote";
const DEV_MODE_ENV: &str = "FLUXNOTE_DEV_MODE";
const DEV_SOCKET_OVERRIDE_ENV: &str = "FLUXNOTE_DEV_SOCKET";
const DEV_SOCKET_HASH_BYTES: usize = 6;

pub fn is_dev_mode() -> bool {
    std::env::var("CARGO").is_ok()
        || std::env::var(DEV_MODE_ENV)
            .map(|value| value == "1")
            .unwrap_or(false)
}

pub fn get_socket_path() -> PathBuf {
    socket_path_from_override().unwrap_or_else(default_socket_path)
}

fn socket_path_from_override() -> Option<PathBuf> {
    std::env::var(DEV_SOCKET_OVERRIDE_ENV)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn default_socket_path() -> PathBuf {
    socket_path_for_repo_root(&repo_root())
}

fn repo_root() -> PathBuf {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir.parent().unwrap_or(manifest_dir);

    repo_root
        .canonicalize()
        .unwrap_or_else(|_| repo_root.to_path_buf())
}

fn socket_path_for_repo_root(repo_root: &Path) -> PathBuf {
    let socket_name = socket_name_for_repo_root(repo_root);

    #[cfg(windows)]
    {
        PathBuf::from(format!(r"\\.\pipe\{socket_name}"))
    }

    #[cfg(not(windows))]
    {
        std::env::temp_dir().join(format!("{socket_name}.sock"))
    }
}

fn socket_name_for_repo_root(repo_root: &Path) -> String {
    let repo_root = repo_root.to_string_lossy();
    let digest = Sha256::digest(repo_root.as_bytes());
    let hash = digest[..DEV_SOCKET_HASH_BYTES]
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();

    format!("{}-dev-{hash}", sanitize_identifier(APP_IDENTIFIER))
}

fn sanitize_identifier(value: &str) -> String {
    let mut sanitized = String::with_capacity(value.len());
    let mut last_was_separator = false;

    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() {
            sanitized.push(ch.to_ascii_lowercase());
            last_was_separator = false;
            continue;
        }

        if sanitized.is_empty() || last_was_separator {
            continue;
        }

        sanitized.push('-');
        last_was_separator = true;
    }

    while sanitized.ends_with('-') {
        sanitized.pop();
    }

    if sanitized.is_empty() {
        "fluxnote".to_string()
    } else {
        sanitized
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Mutex, OnceLock};

    use super::*;

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    #[test]
    fn socket_name_is_stable_for_same_repo_root() {
        let repo_root = Path::new("/tmp/fluxnote-worktree-a");

        let first = socket_name_for_repo_root(repo_root);
        let second = socket_name_for_repo_root(repo_root);

        assert_eq!(first, second);
    }

    #[test]
    fn socket_name_changes_for_different_repo_roots() {
        let first = socket_name_for_repo_root(Path::new("/tmp/fluxnote-worktree-a"));
        let second = socket_name_for_repo_root(Path::new("/tmp/fluxnote-worktree-b"));

        assert_ne!(first, second);
    }

    #[cfg(not(windows))]
    #[test]
    fn default_unix_socket_path_uses_temp_dir_and_is_short() {
        let path = socket_path_for_repo_root(Path::new("/tmp/fluxnote-worktree-a"));

        assert!(path.starts_with(std::env::temp_dir()));
        assert!(path.to_string_lossy().len() < 100);
        assert_eq!(path.extension().and_then(|ext| ext.to_str()), Some("sock"));
    }

    #[cfg(windows)]
    #[test]
    fn default_windows_socket_path_uses_named_pipe_prefix() {
        let path = socket_path_for_repo_root(Path::new(r"C:\src\fluxnote-worktree-a"));

        assert!(path
            .to_string_lossy()
            .starts_with(r"\\.\pipe\app-fluxnote-dev-"));
    }

    #[test]
    fn override_socket_path_takes_precedence() {
        let _guard = env_lock().lock().expect("env lock poisoned");
        let original = std::env::var(DEV_SOCKET_OVERRIDE_ENV).ok();

        #[cfg(windows)]
        let override_path = r"\\.\pipe\fluxnote-dev-test";
        #[cfg(not(windows))]
        let override_path = "/tmp/fluxnote-dev-test.sock";

        std::env::set_var(DEV_SOCKET_OVERRIDE_ENV, override_path);
        let resolved = get_socket_path();

        match original {
            Some(value) => std::env::set_var(DEV_SOCKET_OVERRIDE_ENV, value),
            None => std::env::remove_var(DEV_SOCKET_OVERRIDE_ENV),
        }

        assert_eq!(resolved, PathBuf::from(override_path));
    }
}
