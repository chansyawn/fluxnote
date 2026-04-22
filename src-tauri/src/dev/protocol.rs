use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum IpcMessage {
    #[serde(rename = "deep-link")]
    DeepLink { url: String },
}

impl IpcMessage {
    pub fn to_json(&self) -> anyhow::Result<String> {
        serde_json::to_string(self).map_err(Into::into)
    }

    pub fn from_json(json: &str) -> anyhow::Result<Self> {
        serde_json::from_str(json).map_err(Into::into)
    }
}
