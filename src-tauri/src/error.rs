use anyhow::Error as AnyhowError;
use serde::ser::SerializeMap;
use serde::{Serialize, Serializer};
use serde_json::Value;
use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum BusinessError {
    #[error("Resource not found: {0}")]
    NotFound(String),
    #[error("{0}")]
    InvalidInvoke(String, Option<Value>),
    #[error("{0}")]
    InvalidOperation(String, Option<Value>),
    #[error("{0}")]
    InternalState(String),
}

impl BusinessError {
    fn code(&self) -> &'static str {
        match self {
            Self::NotFound(_) => "BUSINESS.NOT_FOUND",
            Self::InvalidInvoke(_, _) => "BUSINESS.INVALID_INVOKE",
            Self::InvalidOperation(_, _) => "BUSINESS.INVALID_OPERATION",
            Self::InternalState(_) => "INTERNAL",
        }
    }

    fn details(&self) -> Option<&Value> {
        match self {
            Self::InvalidInvoke(_, details) | Self::InvalidOperation(_, details) => {
                details.as_ref()
            }
            Self::NotFound(_) => None,
            Self::InternalState(_) => None,
        }
    }
}

#[derive(Debug)]
pub enum AppError {
    Business(BusinessError),
    Internal(AnyhowError),
}

impl From<BusinessError> for AppError {
    fn from(value: BusinessError) -> Self {
        Self::Business(value)
    }
}

impl From<AnyhowError> for AppError {
    fn from(value: AnyhowError) -> Self {
        Self::Internal(value)
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut map = serializer.serialize_map(Some(3))?;

        match self {
            Self::Business(error) => {
                map.serialize_entry("type", error.code())?;
                map.serialize_entry("message", &error.to_string())?;
                map.serialize_entry("details", &error.details())?;
            }
            Self::Internal(error) => {
                let detail = serde_json::json!({
                    "chain": format!("{error:#}"),
                    "debug": format!("{error:?}"),
                });

                map.serialize_entry("type", "INTERNAL")?;
                map.serialize_entry("message", "Internal server error")?;
                map.serialize_entry("details", &detail)?;
            }
        }

        map.end()
    }
}
