# Contributing

Thanks for your interest in Fluxnotes.

## Commits

Use Conventional Commits, for example `feat: add quick capture` or `fix: preserve block focus`.

Commit messages are checked locally. Pull request titles are checked in CI because Fluxnotes uses squash merges and release automation reads the final merge commit.

Use `feat` for user-visible additions, `fix` for bug fixes, and `chore` for maintenance work that should not appear as a feature or bug fix in release notes.

## Releases

Releases are managed by release-please from Conventional Commits on `master`.

When releasable changes land, release-please opens a release pull request that updates the desktop app version and `apps/desktop/CHANGELOG.md`. Merging that pull request creates a draft GitHub Release, builds the signed app artifacts, uploads them, and then publishes the release.

## Pull Requests

Thank you for considering a contribution. At this time, pull requests are limited to repository collaborators.

Please open an issue first if you would like to discuss a bug, idea, or improvement.

### Collaborator PR Checklist

- Use a Conventional Commit title.
- PR descriptions must contain only `## Summary` and `## Changes` sections.
- Keep PR descriptions as concise as possible, and avoid extra content unless it is necessary.
