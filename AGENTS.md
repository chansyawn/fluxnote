# AGENTS.md

## Development

- Use Vite+ as the primary frontend toolchain.
- File naming must use `kebab-case` only, for example `user-profile.tsx`.
- Use a Feature-First file structure:
  - Shared business logic/components should be split by feature under `src/features`.
  - Page-private functionality should live in each route's `-features` folder.
  - The `app` directory should contain global content.
- Backend Rust code must also follow Feature-First structure under `src-tauri/src/features`.
- Follow modern Rust module conventions: do not use `mod.rs`; use same-name module files (for example `features.rs` for `features/`).

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

## Backend Error Handling

- Follow this split: business/domain errors use `thiserror`; internal/technical errors use `anyhow`.
- Every Tauri command must return `AppResult<T>` with `AppError` as the global error surface.
- `AppError` must serialize to a flat JSON payload:
  - `type: string`
  - `message: string`
  - `details: any`
- `BusinessError` variants must map to `BUSINESS.[CODE]` names, for example:
  - `BUSINESS.NOT_FOUND`
  - `BUSINESS.INVALID_INVOKE`
- `INVALID_INVOKE` should be used for command argument validation failures (Garde) and include the validation report in `details`.
- Internal errors (database, IO, runtime failures, etc.) must be mapped to `INTERNAL` and preserve the `anyhow` context chain in `details`.

## Frontend-Backend Interaction

- Define backend commands in `src-tauri/src` with `#[tauri::command]` and register them in the builder `invoke_handler`.
- Prefer a request-struct + `garde` validation pattern for command args.
- Frontend code must import invoke from `@/app/invoke`; do not call `@tauri-apps/api/core` `invoke` directly in pages/features.
- Keep API request/response types and command wrappers in `src/clients`.
- Export client APIs through `src/clients/index.ts` as the single frontend entrypoint for backend commands.
- UI components and routes must use TanStack Query for backend data loading, with the shared `queryClient` from `@/app/query`.
- Ensure object keys passed to `invoke` exactly match Rust command argument names.

## Workflow

- After every frontend change, run `vp check` and `vp build`.
- After every backend change, run `cargo clippy`, `cargo fmt`, and `cargo check`.
