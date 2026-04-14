use std::collections::HashSet;

#[derive(Debug, Clone)]
pub struct RuntimeInput {
    pub enabled: bool,
    pub window_visible: bool,
    pub force_archive_when_hidden: bool,
    pub stale_block_ids: HashSet<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeDecision {
    pub pending_archive_block_ids: HashSet<String>,
    pub archive_target_block_ids: HashSet<String>,
    pub should_archive: bool,
}

pub fn decide_runtime_update(input: RuntimeInput) -> RuntimeDecision {
    if !input.enabled {
        return RuntimeDecision {
            pending_archive_block_ids: HashSet::new(),
            archive_target_block_ids: HashSet::new(),
            should_archive: false,
        };
    }

    if input.window_visible {
        return RuntimeDecision {
            pending_archive_block_ids: input.stale_block_ids,
            archive_target_block_ids: HashSet::new(),
            should_archive: false,
        };
    }

    let should_archive = input.force_archive_when_hidden || !input.stale_block_ids.is_empty();
    RuntimeDecision {
        pending_archive_block_ids: HashSet::new(),
        archive_target_block_ids: input.stale_block_ids,
        should_archive,
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::{decide_runtime_update, RuntimeInput};

    #[test]
    fn decide_runtime_update_returns_empty_pending_when_disabled() {
        let stale = HashSet::from(["block-1".to_string()]);
        let decision = decide_runtime_update(RuntimeInput {
            enabled: false,
            window_visible: true,
            force_archive_when_hidden: false,
            stale_block_ids: stale,
        });

        assert!(decision.pending_archive_block_ids.is_empty());
        assert!(decision.archive_target_block_ids.is_empty());
        assert!(!decision.should_archive);
    }

    #[test]
    fn decide_runtime_update_tracks_pending_when_visible() {
        let stale = HashSet::from(["block-1".to_string(), "block-2".to_string()]);
        let decision = decide_runtime_update(RuntimeInput {
            enabled: true,
            window_visible: true,
            force_archive_when_hidden: false,
            stale_block_ids: stale.clone(),
        });

        assert_eq!(decision.pending_archive_block_ids, stale);
        assert!(decision.archive_target_block_ids.is_empty());
        assert!(!decision.should_archive);
    }

    #[test]
    fn decide_runtime_update_archives_when_hidden_and_stale_exists() {
        let decision = decide_runtime_update(RuntimeInput {
            enabled: true,
            window_visible: false,
            force_archive_when_hidden: false,
            stale_block_ids: HashSet::from(["block-1".to_string()]),
        });

        assert!(decision.pending_archive_block_ids.is_empty());
        assert_eq!(
            decision.archive_target_block_ids,
            HashSet::from(["block-1".to_string()])
        );
        assert!(decision.should_archive);
    }

    #[test]
    fn decide_runtime_update_forces_archive_when_hidden_without_stale() {
        let decision = decide_runtime_update(RuntimeInput {
            enabled: true,
            window_visible: false,
            force_archive_when_hidden: true,
            stale_block_ids: HashSet::new(),
        });

        assert!(decision.pending_archive_block_ids.is_empty());
        assert!(decision.archive_target_block_ids.is_empty());
        assert!(decision.should_archive);
    }

    #[test]
    fn decide_runtime_update_skips_archive_when_hidden_without_stale_and_no_force() {
        let decision = decide_runtime_update(RuntimeInput {
            enabled: true,
            window_visible: false,
            force_archive_when_hidden: false,
            stale_block_ids: HashSet::new(),
        });

        assert!(decision.pending_archive_block_ids.is_empty());
        assert!(decision.archive_target_block_ids.is_empty());
        assert!(!decision.should_archive);
    }
}
