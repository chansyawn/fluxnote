# AGENTS.md

## Development

- Use Vite+ as the primary frontend toolchain.
- File naming must use `kebab-case` only, for example `user-profile.tsx`.
- Use a Feature-First file structure:
  - Shared business logic/components should be split by feature under `src/features`.
  - Page-private functionality should live in each route's `-features` folder.
  - The `app` directory should contain global content.

## UI

- Use the shadcn CLI to create new components when appropriate.
- Do not modify existing shadcn components in `src/ui` unless explicitly requested.
- Use `lucide-react` for icons, and name icon wrappers with an `Icon` suffix.
- Design and test with RTL behavior in mind.

## I18n

- Use Lingui explicit IDs for all translatable text. Do not rely on auto-generated IDs; IDs must stay semantic and stable.
- After adding or changing translatable text, run `vp run lingui:extract` to update the `.po` files.
- The project uses `@lingui/vite-plugin`, so Vite compiles `.po` files into runtime format during development and build. Do not run `vp run lingui:compile`.
- `pseudo` is a pseudo-localized placeholder locale for development and debugging only. Do not translate it manually; use it only for testing scenarios such as RTL layout checks or long-text overflow.

## Workflow

- After every frontend change, run `vp check` and `vp build`.
- After every backend change, run `cargo clippy`, `cargo fmt`, and `cargo check`.
