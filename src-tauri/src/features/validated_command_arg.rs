use garde::Validate;
use serde::de::DeserializeOwned;
use tauri::ipc::{CommandArg, CommandItem, InvokeBody, InvokeError};
use tauri::Runtime;
use tracing::warn;

use crate::error::{AppError, BusinessError};

pub struct Validated<T>(pub T);

impl<T> Validated<T> {
    pub fn into_inner(self) -> T {
        self.0
    }
}

impl<T> std::ops::Deref for Validated<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<T> AsRef<T> for Validated<T> {
    fn as_ref(&self) -> &T {
        &self.0
    }
}

fn validate_for_command<T>(value: T, command_name: &str) -> Result<T, InvokeError>
where
    T: Validate,
    T::Context: Default,
{
    value.validate().map_err(|report| {
        warn!(
            command = command_name,
            error = %report,
            "command argument validation failed"
        );

        let details = serde_json::to_value(&report)
            .ok()
            .or_else(|| Some(serde_json::json!({ "report": report.to_string() })));

        let app_error: AppError =
            BusinessError::InvalidInvoke("Validation failed".to_string(), details).into();
        InvokeError::from(app_error)
    })?;

    Ok(value)
}

fn invalid_invoke_error(message: &str, details: Option<serde_json::Value>) -> InvokeError {
    let app_error: AppError = BusinessError::InvalidInvoke(message.to_string(), details).into();
    InvokeError::from(app_error)
}

impl<'de, R, T> CommandArg<'de, R> for Validated<T>
where
    R: Runtime,
    T: DeserializeOwned + Validate,
    T::Context: Default,
{
    fn from_command(command: CommandItem<'de, R>) -> Result<Self, InvokeError> {
        let command_name = command.name;
        let value = match command.message.payload() {
            InvokeBody::Json(json) => {
                serde_json::from_value::<T>(json.clone()).map_err(|error| {
                    warn!(
                        command = command_name,
                        error = %error,
                        "command argument deserialization failed"
                    );
                    invalid_invoke_error(
                        "Invalid invoke arguments",
                        Some(serde_json::json!({ "error": error.to_string() })),
                    )
                })?
            }
            InvokeBody::Raw(_) => {
                return Err(invalid_invoke_error(
                    "Invalid invoke arguments",
                    Some(serde_json::json!({
                        "error": "bytes payload is not supported for this command"
                    })),
                ));
            }
        };
        let validated = validate_for_command(value, command_name)?;
        Ok(Self(validated))
    }
}

#[cfg(test)]
mod tests {
    use garde::Validate;
    use serde::Deserialize;
    use serde_json::Value;

    use super::validate_for_command;

    #[derive(Debug, Deserialize, Validate)]
    struct TestArgs {
        #[garde(length(min = 1))]
        name: String,
    }

    #[test]
    fn validate_for_command_returns_business_invalid_invoke_on_failure() {
        let error = validate_for_command(
            TestArgs {
                name: String::new(),
            },
            "test_command",
        )
        .expect_err("expected validation failure");

        let payload: &Value = &error.0;
        assert_eq!(
            payload.get("type").and_then(Value::as_str),
            Some("BUSINESS.INVALID_INVOKE")
        );
        assert_eq!(
            payload.get("message").and_then(Value::as_str),
            Some("Validation failed")
        );
        assert!(payload.get("details").is_some());
    }

    #[test]
    fn validate_for_command_passes_when_input_is_valid() {
        let validated = validate_for_command(
            TestArgs {
                name: "FluxNote".to_string(),
            },
            "test_command",
        )
        .expect("expected validation success");

        assert_eq!(validated.name, "FluxNote");
    }
}
