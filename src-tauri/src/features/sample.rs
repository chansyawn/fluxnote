use garde::Validate;
use serde::Deserialize;
use tracing::{info, warn};

use crate::error::{AppResult, BusinessError};
use crate::features::validated_command_arg::Validated;

#[derive(Debug, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct GreetArgs {
    #[garde(length(min = 1, max = 20))]
    pub name: String,
}

// Use `instrument` on command boundaries so every invoke has a stable trace context.
#[tauri::command]
#[tracing::instrument(
    name = "command.greet",
    skip(args),
    fields(name_len = tracing::field::Empty)
)]
pub async fn greet(args: Validated<GreetArgs>) -> AppResult<String> {
    let args = args.into_inner();
    tracing::Span::current().record("name_len", tracing::field::display(args.name.len()));

    if args.name.eq_ignore_ascii_case("missing") {
        warn!("greet resource not found by business rule");
        return Err(BusinessError::NotFound(args.name).into());
    }

    // Prefer level-based events: `info` for expected state changes, `warn/error` for exceptional paths.
    info!("greet command completed successfully");
    Ok(format!(
        "Hello, {}! This message is from the Rust backend.",
        args.name
    ))
}
