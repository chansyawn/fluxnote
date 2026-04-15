use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use anyhow::{Context, Result};
use base64::Engine;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

use crate::error::{AppResult, BusinessError};
use crate::features::assets::{CreateAssetResult, ResolveAssetResult};

const ASSET_SCHEME_PREFIX: &str = "assets://";
const ASSET_DIRECTORY_NAME: &str = "assets";
const MAX_ASSET_BYTES: usize = 10 * 1024 * 1024;
const SHORT_HASH_BYTES: usize = 8;
const SHORT_HASH_HEX_LENGTH: usize = SHORT_HASH_BYTES * 2;

pub fn create_asset(
    app: &AppHandle,
    block_id: &str,
    mime_type: &str,
    file_name: Option<&str>,
    data_base64: &str,
) -> AppResult<CreateAssetResult> {
    let asset_dir = ensure_asset_dir(app)?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64)
        .context("failed to decode asset payload")?;

    if bytes.len() > MAX_ASSET_BYTES {
        return Err(BusinessError::InvalidOperation(
            "Image must not exceed 10 MiB".to_string(),
            None,
        )
        .into());
    }

    let extension = extension_for_mime_type(mime_type)?;
    let hash = Sha256::digest(&bytes)
        .iter()
        .take(SHORT_HASH_BYTES)
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    let stored_file_name = format!("{block_id}-{hash}.{extension}");
    let file_path = asset_dir.join(&stored_file_name);

    remove_asset_files_by_hash(&asset_dir, block_id, &hash)?;

    fs::write(&file_path, bytes)
        .with_context(|| format!("failed to write asset file: {}", file_path.display()))?;

    Ok(CreateAssetResult {
        asset_url: format!("{ASSET_SCHEME_PREFIX}{hash}"),
        alt_text: derive_alt_text(file_name),
    })
}

pub fn resolve_asset(
    app: &AppHandle,
    block_id: &str,
    asset_url: &str,
) -> AppResult<ResolveAssetResult> {
    if is_external_asset_url(asset_url) {
        return Ok(ResolveAssetResult {
            resolved_path: asset_url.to_string(),
        });
    }

    let hash = parse_asset_hash(asset_url)?;
    let asset_dir = ensure_asset_dir(app)?;
    let file_path = find_asset_file_by_hash(&asset_dir, block_id, &hash)?
        .ok_or_else(|| BusinessError::NotFound(format!("{block_id}:{asset_url}")))?;

    Ok(ResolveAssetResult {
        resolved_path: file_path.to_string_lossy().into_owned(),
    })
}

pub fn cleanup_assets_after_content_update(
    app: &AppHandle,
    block_id: &str,
    previous_content: &str,
    next_content: &str,
) -> Result<()> {
    let previous_hashes = extract_asset_hashes(previous_content);
    let next_hashes = extract_asset_hashes(next_content);
    let asset_dir = ensure_asset_dir(app)?;

    for hash in previous_hashes.difference(&next_hashes) {
        remove_asset_files_by_hash(&asset_dir, block_id, hash)?;
    }

    Ok(())
}

pub fn cleanup_assets_for_block_content(
    app: &AppHandle,
    block_id: &str,
    content: &str,
) -> Result<()> {
    let asset_dir = ensure_asset_dir(app)?;

    for hash in extract_asset_hashes(content) {
        remove_asset_files_by_hash(&asset_dir, block_id, &hash)?;
    }

    Ok(())
}

fn ensure_asset_dir(app: &AppHandle) -> Result<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .context("failed to resolve app data directory")?;
    let asset_dir = app_data_dir.join(ASSET_DIRECTORY_NAME);

    fs::create_dir_all(&asset_dir)
        .with_context(|| format!("failed to create asset directory: {}", asset_dir.display()))?;

    Ok(asset_dir)
}

fn extension_for_mime_type(mime_type: &str) -> AppResult<&'static str> {
    match mime_type {
        "image/png" => Ok("png"),
        "image/jpeg" => Ok("jpg"),
        "image/webp" => Ok("webp"),
        "image/gif" => Ok("gif"),
        _ => Err(BusinessError::InvalidOperation(
            format!("Unsupported image type: {mime_type}"),
            None,
        )
        .into()),
    }
}

fn derive_alt_text(raw_file_name: Option<&str>) -> String {
    raw_file_name
        .and_then(|name| Path::new(name).file_stem())
        .and_then(|stem| stem.to_str())
        .map(str::trim)
        .filter(|stem| !stem.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "image".to_string())
}

fn parse_asset_hash(asset_url: &str) -> AppResult<String> {
    let Some(hash) = asset_url.strip_prefix(ASSET_SCHEME_PREFIX) else {
        return Err(BusinessError::InvalidOperation(
            format!("Unsupported asset url: {asset_url}"),
            None,
        )
        .into());
    };

    if hash.len() != SHORT_HASH_HEX_LENGTH || !hash.chars().all(|char| char.is_ascii_hexdigit()) {
        return Err(BusinessError::InvalidOperation(
            format!("Invalid asset hash: {asset_url}"),
            None,
        )
        .into());
    }

    Ok(hash.to_ascii_lowercase())
}

fn is_external_asset_url(asset_url: &str) -> bool {
    asset_url.starts_with("http://")
        || asset_url.starts_with("https://")
        || asset_url.starts_with("data:")
}

fn extract_asset_hashes(markdown: &str) -> HashSet<String> {
    let mut hashes = HashSet::new();
    let mut search_index = 0;

    while let Some(relative_index) = markdown[search_index..].find(ASSET_SCHEME_PREFIX) {
        let start_index = search_index + relative_index + ASSET_SCHEME_PREFIX.len();
        if let Some(hash) = try_extract_short_hash(&markdown[start_index..]) {
            hashes.insert(hash.to_ascii_lowercase());
            search_index = start_index + SHORT_HASH_HEX_LENGTH;
            continue;
        }

        search_index = start_index + 1;
    }

    hashes
}

fn try_extract_short_hash(input: &str) -> Option<&str> {
    if input.len() < SHORT_HASH_HEX_LENGTH {
        return None;
    }

    let hash = &input[..SHORT_HASH_HEX_LENGTH];

    if !hash.chars().all(|char| char.is_ascii_hexdigit()) {
        return None;
    }

    if input
        .as_bytes()
        .get(SHORT_HASH_HEX_LENGTH)
        .is_some_and(|byte| byte.is_ascii_hexdigit())
    {
        return None;
    }

    Some(hash)
}

fn find_asset_file_by_hash(
    asset_dir: &Path,
    block_id: &str,
    hash: &str,
) -> Result<Option<PathBuf>> {
    let prefix = format!("{block_id}-{hash}.");
    let entries = fs::read_dir(asset_dir)
        .with_context(|| format!("failed to read asset directory: {}", asset_dir.display()))?;

    for entry in entries {
        let entry = entry.context("failed to read asset directory entry")?;
        let file_name = entry.file_name();
        let file_name = file_name.to_string_lossy();

        if file_name.starts_with(&prefix) {
            return Ok(Some(entry.path()));
        }
    }

    Ok(None)
}

fn remove_asset_files_by_hash(asset_dir: &Path, block_id: &str, hash: &str) -> Result<()> {
    let prefix = format!("{block_id}-{hash}.");
    let entries = fs::read_dir(asset_dir)
        .with_context(|| format!("failed to read asset directory: {}", asset_dir.display()))?;

    for entry in entries {
        let entry = entry.context("failed to read asset directory entry")?;
        let file_name = entry.file_name();
        let file_name = file_name.to_string_lossy();

        if file_name.starts_with(&prefix) {
            fs::remove_file(entry.path()).with_context(|| {
                format!("failed to remove asset file: {}", entry.path().display())
            })?;
        }
    }

    Ok(())
}
