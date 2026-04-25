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
  - Shared business logic/components should be split by feature under `src/renderer/features`.
  - Page-private functionality should live in each route's `-features` folder under `src/renderer/routes`.
  - The `src/renderer/app` directory should contain global content.

### Do / Don't

- Keep frontend payload keys aligned with backend request-struct fields.
- Do not introduce duplicate client command entrypoints outside `src/renderer/clients` + `src/renderer/clients/index.ts`.
- Keep CLI source in `src/cli` as TypeScript and build it with `vite.cli.config.ts`. Build output goes to `.vite/cli/`.
- CLI commands must route through Electron main's backend command dispatcher over local IPC; do not let CLI code write the database directly.
- The CLI ships inside the Electron app bundle (`Contents/Resources/cli/`) and uses `ELECTRON_RUN_AS_NODE=1` via a shell wrapper. The `src/cli/flux` wrapper script is source-controlled; `.vite/cli/flux-cli.mjs` is a build artifact. Both are assembled into the app bundle during packaging via the forge `packageAfterCopy` hook.

## Frontend

### Toolchain & Structure

- Build frontend features with Vite+ conventions and keep route-private code under each route's `-features` folder.
- Place shared frontend business logic and reusable feature-level components under `src/renderer/features`.
- Keep application-wide frontend bootstrapping and global cross-feature content in `src/renderer/app`.

### UI Conventions

- Use the shadcn CLI to create new components when appropriate.
- Do not modify existing shadcn components in `src/renderer/ui` unless explicitly requested.
- Use `lucide-react` for icons, and name icon wrappers with an `Icon` suffix.
- Design and test with RTL behavior in mind.

### I18n (Lingui)

- Use Lingui explicit IDs for all translatable text. Do not rely on auto-generated IDs; IDs must stay semantic and stable.
- After adding or changing translatable text, run `vp run lingui:extract` to update the `.po` files.
- The project uses `@lingui/vite-plugin`, so Vite compiles `.po` files into runtime format during development and build. Do not run `vp run lingui:compile`.
- `pseudo` is a pseudo-localized placeholder locale for development and debugging only. Do not translate it manually; use it only for testing scenarios such as RTL layout checks or long-text overflow.

### Frontend-Backend Client Boundary

- Frontend code must import invoke from `@renderer/app/invoke`; do not call backend bridge APIs directly in pages/features.
- Keep API request/response types and command wrappers in `src/renderer/clients`.
- Export client APIs through `src/renderer/clients/index.ts` as the single frontend entrypoint for backend commands.
- UI components and routes must use TanStack Query for backend data loading, with the shared `queryClient` from `@renderer/app/query`.
- Configuration read/write in frontend must follow the existing preferences framework in `src/renderer/app/preferences` (schema + store). Do not introduce parallel config persistence paths.

## Backend

### Module & Layout

- Backend TypeScript code must follow Feature-First structure under `src/main/features`.
- Keep Electron main process as the single backend runtime entry and route backend commands through IPC handlers only.

### Database (Drizzle)

- Keep the SQLite schema and Drizzle runtime helpers under `src/main/features/database`.
- Use `drizzle-orm/better-sqlite3` in Electron main; do not introduce renderer-side database access.
- Generate schema migrations with `vp run db:generate` and commit the generated `src/main/features/database/drizzle/` directory.
- Keep runtime migration loading compatible with Electron packaging by treating `src/main/features/database/drizzle/` as a packaged resource.

### Command & Validation

- Define backend command dispatch in `src/main/features/backend-commands.ts` and register IPC handlers in `src/main/index.ts`.
- Prefer explicit request parsing/validation helpers per command so command bodies stay business-focused.
- Backend can read configuration values for runtime behavior, but must not persist or mutate frontend preference/config files. Configuration writes are frontend-owned.
- Treat deeplinks and CLI requests as adapters into backend commands rather than separate business logic entrypoints.

### Error Model

- Keep business/domain errors and internal/technical errors separated in command handlers.
- Every backend IPC command should return or throw a flat JSON error payload:
  - `type: string`
  - `message: string`
  - `details: any`
- Business errors must map to `BUSINESS.[CODE]` names, for example:
  - `BUSINESS.NOT_FOUND`
  - `BUSINESS.INVALID_INVOKE`
- `INVALID_INVOKE` should be used for command argument validation failures and include validation details in `details`.
- Internal errors (database, IO, runtime failures, etc.) must be mapped to `INTERNAL` and preserve debug context in `details` when available.

### Logging

- Use a single structured logging approach in Electron main; do not introduce ad-hoc logging APIs.

## Workflow & Verification

`vp build` defaults to the root `vite.config.ts`. For this multi-target Electron project, always pass `--config` explicitly for renderer/main/preload validation.

### When Frontend Changes

- Run `vp check`.
- Run `vp build -c vite.renderer.config.ts`.

### When Backend Changes

- Run `vp check`.
- Run `vp build -c vite.main.config.ts`.
- Run `vp build -c vite.preload.config.ts`.
- Run `vp run dev` for runtime verification when IPC/main process behavior changes.

### When CLI Changes

- Run `vp check`.
- Run `vp run cli:build`.
- Test with `vp run flux`.

### When Database Schema Changes

- Run `vp run db:generate`.
- Run `vp check`.
- Run `vp build -c vite.main.config.ts`.

### References

- Frontend sample pattern: `src/renderer/routes/sample/index.tsx`
- Backend sample pattern: `src/main/features/backend-commands.ts`

### Spec Maintenance

- Update `AGENTS.md` promptly whenever repository conventions or infrastructure are added or changed.
