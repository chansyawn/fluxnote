# AGENTS.md

## General (Common)

### Priority & Conflict Resolution

- Follow the user's latest explicit instruction first, unless it conflicts with platform safety constraints.
- Prefer rules defined closer to the current working directory over more global guidance.
- `must not` and prohibition rules take precedence over recommendation rules.
- When rules conflict or remain ambiguous, choose the more conservative and verifiable implementation path.

### Architecture Baseline

- Use Vite+ as the primary frontend toolchain.
- File naming must use `kebab-case` only, for example `user-profile.tsx`.
- Use a Feature-First file structure:
  - Shared business logic/components should be split by feature under `src/features`.
  - Page-private functionality should live in each route's `-features` folder.
  - The `app` directory should contain global content.

### Do / Don't

- Keep frontend payload keys aligned with backend request-struct fields.
- Do not introduce duplicate client command entrypoints outside `src/clients` + `src/clients/index.ts`.

## Frontend

### Toolchain & Structure

- Build frontend features with Vite+ conventions and keep route-private code under each route's `-features` folder.
- Place shared frontend business logic and reusable feature-level components under `src/features`.
- Keep application-wide frontend bootstrapping and global cross-feature content in `app`.

### UI Conventions

- Use the shadcn CLI to create new components when appropriate.
- Do not modify existing shadcn components in `src/ui` unless explicitly requested.
- Use `lucide-react` for icons, and name icon wrappers with an `Icon` suffix.
- Design and test with RTL behavior in mind.

### I18n (Lingui)

- Use Lingui explicit IDs for all translatable text. Do not rely on auto-generated IDs; IDs must stay semantic and stable.
- After adding or changing translatable text, run `vp run lingui:extract` to update the `.po` files.
- The project uses `@lingui/vite-plugin`, so Vite compiles `.po` files into runtime format during development and build. Do not run `vp run lingui:compile`.
- `pseudo` is a pseudo-localized placeholder locale for development and debugging only. Do not translate it manually; use it only for testing scenarios such as RTL layout checks or long-text overflow.

### Frontend-Backend Client Boundary

- Frontend code must import invoke from `@/app/invoke`; do not call `@tauri-apps/api/core` `invoke` directly in pages/features.
- Keep API request/response types and command wrappers in `src/clients`.
- Export client APIs through `src/clients/index.ts` as the single frontend entrypoint for backend commands.
- UI components and routes must use TanStack Query for backend data loading, with the shared `queryClient` from `@/app/query`.
- Configuration read/write in frontend must follow the existing preferences framework in `src/app/preferences` (schema + store). Do not introduce parallel config persistence paths.

## Backend

### Module & Layout

- Backend Rust code must follow Feature-First structure under `src-tauri/src/features`.
- Follow modern Rust module conventions: do not use `mod.rs`; use same-name module files (for example `features.rs` for `features/`).

### Command & Validation

- Define backend commands in `src-tauri/src` with `#[tauri::command]` and register them in the builder `invoke_handler`.
- Prefer a request-struct + `garde` validation pattern for command args.
- Prefer command signatures that consume a validated request object (for example `Validated<TRequest>`) so validation/mapping is centralized and command bodies stay business-focused.
- Backend can read configuration values for runtime behavior, but must not persist or mutate frontend preference/config files. Configuration writes are frontend-owned.

### Error Model

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

### Logging

- Use `tracing` for backend logs; do not introduce ad-hoc logging APIs.
- Add `#[tracing::instrument]` at Tauri command boundaries for stable request-level context.

## Workflow & Verification

### When Frontend Changes

- Run `vp check`.
- Run `vp build`.

### When Backend Changes

- Run `cargo fmt`.
- Run `cargo clippy`.
- Run `cargo check`.

### References

- Frontend sample pattern: `src/routes/sample/index.tsx`
- Backend sample pattern: `src-tauri/src/features/sample.rs`

### Spec Maintenance

- Update `AGENTS.md` promptly whenever repository conventions or infrastructure are added or changed.
