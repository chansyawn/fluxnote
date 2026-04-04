use garde::Validate;
use serde::Deserialize;
use tracing::{info, warn};

use crate::error::{AppResult, BusinessError};

#[derive(Debug, Deserialize, Validate)]
pub struct GreetArgs {
    #[garde(length(min = 1, max = 20))]
    pub name: String,
}

// Use `instrument` on command boundaries so every invoke has a stable trace context.
#[tauri::command]
#[tracing::instrument(
    name = "command.greet",
    skip(name),
    fields(name_len = tracing::field::Empty)
)]
pub async fn greet(name: String) -> AppResult<String> {
    let args = GreetArgs { name };
    tracing::Span::current().record("name_len", tracing::field::display(args.name.len()));

    info!("starting greet argument validation");

    args.validate().map_err(|report| {
        warn!(error = %report, "greet argument validation failed");
        let details = serde_json::to_value(&report)
            .ok()
            .or_else(|| Some(serde_json::json!({ "report": report.to_string() })));

        BusinessError::InvalidInvoke("Validation failed".to_string(), details)
    })?;

    info!("greet argument validation passed");

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
