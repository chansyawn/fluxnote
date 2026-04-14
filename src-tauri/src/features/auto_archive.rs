pub(crate) mod service;

use std::{collections::HashSet, sync::Mutex};

#[derive(Debug, Default)]
pub struct AutoArchiveState {
    inner: Mutex<AutoArchiveRuntimeState>,
}

#[derive(Debug, Default)]
struct AutoArchiveRuntimeState {
    pub pending_archive_block_ids: HashSet<String>,
    pub last_scan_at: Option<String>,
    pub window_visible: bool,
}

impl AutoArchiveState {
    pub fn update(
        &self,
        pending_archive_block_ids: HashSet<String>,
        last_scan_at: String,
        window_visible: bool,
    ) -> bool {
        let mut state = self.inner.lock().expect("auto archive state lock poisoned");
        let pending_changed = state.pending_archive_block_ids != pending_archive_block_ids;
        let visibility_changed = state.window_visible != window_visible;

        state.pending_archive_block_ids = pending_archive_block_ids;
        state.last_scan_at = Some(last_scan_at);
        state.window_visible = window_visible;

        pending_changed || visibility_changed
    }

    pub fn clear(&self, last_scan_at: String, window_visible: bool) -> bool {
        self.update(HashSet::new(), last_scan_at, window_visible)
    }

    pub fn pending_archive_block_ids(&self) -> HashSet<String> {
        self.inner
            .lock()
            .expect("auto archive state lock poisoned")
            .pending_archive_block_ids
            .clone()
    }
}
