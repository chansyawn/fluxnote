# AGENTS.md

## General (Common)

### Architecture

- Use **Vite+** as the primary toolchain.
- File naming must use `kebab-case` by default (auto-generated files are excluded), for example `user-profile.tsx`.

## Frontend

### Structure

- Place shared frontend business logic and reusable feature-level components under `src/renderer/features`.
- Keep application-wide frontend bootstrapping and global cross-feature content in `src/renderer/app`.

### UI Conventions

- Use the shadcn CLI to create new components when appropriate.
- Do not modify existing shadcn components in `src/renderer/ui` unless explicitly requested.
- Use `lucide-react` for icons, and name icon wrappers with an `Icon` suffix.
- Design and test with RTL behavior in mind.

### I18n (Lingui)

- Use Lingui explicit IDs for all translatable text; IDs must stay semantic and stable. After adding or changing translatable text, run `vp run lingui:extract` to update `.po` files.
- The project uses `@lingui/vite-plugin`; do not run `vp run lingui:compile`. `pseudo` is for development/testing only (for example, RTL checks or long-text overflow checks), and must not be translated manually.

## Backend

### Structure

- **App assembly** (`src/main/app/`): process bootstrap, runtime composition, `ipc-registry` (aggregate IPC commands from feature manifests), and `backend-commands` (CLI / deep-link command surface).
- **Platform core** (`src/main/core/`): IPC infrastructure (`core/ipc`), persistence (`core/persistence`, e.g. `BackendStore`), and **Drizzle** under `core/database`.
- **Feature-First domains** (`src/main/features/<domain>/`): business logic with stable `index.ts` exports, per-domain `manifest.ts`, `service.ts`, optional `repository.ts` / `mapper.ts`, and per-domain `ipc-commands.ts` (and tests) for that area.
- Keep file names role-based inside feature directories. Prefer `service.ts`, `repository.ts`, `mapper.ts`, and `ipc-commands.ts` over repeating the domain prefix in file names.
- Keep Electron main process as the single backend runtime entry; renderer talks to the backend through IPC only (plus the separate CLI socket for the `flux` helper).

### Shared contracts

- **Domain DTOs and IPC fragments** live under `src/shared/domains/<domain>/` (for example `models.ts`, `ipc-commands.ts`, `ipc-events.ts`).
- **Merged IPC registries** live under `src/shared/ipc/registry/`; import the stable surface from `@shared/ipc/contracts` unless you are editing a specific domain.
- **Non-IPC entrypoints** (for example `backend-command-contracts`) are under `src/shared/entrypoints/`.
- **Transport envelopes** (for example the standalone CLI IPC line protocol) are under `src/shared/transport/`.
- **Preload/runtime-only types** (for example `FluxnoteRuntime`) are under `src/shared/platform/`.

### Database (Drizzle)

- Keep the SQLite schema and Drizzle runtime helpers under `src/main/core/database`.
- Database access is main-process only; do not introduce renderer-side database access.

### Error Model

- Backend IPC command errors must use a flat JSON payload:

```ts
{
  type: string;
  message: string;
  details: any;
}
```

- Keep business/domain errors separate from internal/technical errors.
- Business errors must use `BUSINESS.[CODE]` naming (for example, `BUSINESS.NOT_FOUND`, `BUSINESS.INVALID_INVOKE`).
- Use `BUSINESS.INVALID_INVOKE` for command argument validation failures and include validation details in `details`.
- Map all internal errors (database, IO, runtime failures, and others) to `INTERNAL` and preserve debug context in `details` when available.

## Workflow & Verification

### Standard Verification

After any code change, run:

```bash
vp check
vp run package
```

### Database Schema Changes

- For database schema changes, run `vp run db:generate` before verification and commit the generated migration files.

## Appendix

### References

- Frontend sample pattern: `src/renderer/routes/lab/index.tsx`
- Backend sample pattern: `src/main/app/backend-commands.ts` and `src/main/app/ipc-registry.ts`

### Spec Maintenance

- Update `AGENTS.md` promptly whenever repository conventions or infrastructure are added or changed.
