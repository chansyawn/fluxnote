use garde::Validate;
use serde::Deserialize;

use crate::error::{AppResult, BusinessError};

#[derive(Debug, Deserialize, Validate)]
pub struct GreetArgs {
    #[garde(length(min = 1, max = 20))]
    pub name: String,
}

#[tauri::command]
pub async fn greet(name: String) -> AppResult<String> {
    let args = GreetArgs { name };

    args.validate().map_err(|report| {
        let details = serde_json::to_value(&report)
            .ok()
            .or_else(|| Some(serde_json::json!({ "report": report.to_string() })));

        BusinessError::InvalidInvoke("Validation failed".to_string(), details)
    })?;

    if args.name.eq_ignore_ascii_case("missing") {
        return Err(BusinessError::NotFound(args.name).into());
    }

    Ok(format!(
        "Hello, {}! This message is from the Rust backend.",
        args.name
    ))
}
