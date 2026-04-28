# AGENTS.md

## General (Common)

### Architecture

- Use **Vite+** as the primary toolchain.
- File naming must use `kebab-case` by default (auto-generated files are excluded), for example `user-profile.tsx`.

### File Organization

```bash
src/
  main/
    app/                  # app assembly: bootstrap, runtime composition, IPC registration, backend command surface
      bootstrap.ts
      runtime.ts
      protocols.ts
      ipc-registry.ts
      feature-manifests.ts
      backend-commands.ts
    core/                 # platform core shared by backend features
      database/
      features/
      ipc/
      persistence/
    features/             # feature-first backend domains
      <feature>/
        index.ts          # stable feature export
        manifest.ts       # feature contribution to app assembly
        service.ts        # feature business logic, data access, and DTO mapping by default
        ipc-commands.ts   # renderer IPC command implementations
        *.test.ts            # colocated tests when feature-scoped

  renderer/
    app/                  # renderer bootstrapping and global cross-feature content
    clients/              # typed renderer-side IPC clients
    features/             # shared frontend business logic and reusable feature-level components
      <feature>/
    routes/
      -features/          # route-local shared logic/components
    ui/
      components/         # shadcn/ui components; do not modify unless explicitly requested
      lib/
    locales/

  shared/
    backend-entrypoint/   # non-renderer backend entrypoint contracts
      commands.ts         # CLI / deep-link backend command contracts
      cli-ipc.ts          # CLI socket transport envelopes
    features/             # cross-process feature DTOs, schemas, and IPC fragments
      <feature>/
        index.ts          # stable feature-level contract export
        models.ts         # optional: shared DTO schemas and inferred public types
        ipc-commands.ts   # optional: request/response schemas for renderer-to-main commands
        ipc-events.ts     # optional: payload schemas for main-to-renderer events
    ipc/                  # merged IPC registries and generic IPC types
      commands.ts         # merged IPC command registry
      events.ts           # merged IPC event registry
      contracts.ts        # stable generic IPC surface
      errors.ts           # flat IPC error payload model
    electron-runtime.ts   # preload-exposed renderer runtime contract
```

- Use `kebab-case` file names by default.

## Frontend

### UI Conventions

- Use the shadcn CLI to create new components when appropriate.
- Do not modify existing shadcn components in `src/renderer/ui` unless explicitly requested.
- Use `lucide-react` for icons, and name icon wrappers with an `Icon` suffix.
- Design and test with RTL behavior in mind.

### I18n (Lingui)

- Use Lingui explicit IDs for all translatable text; IDs must stay semantic and stable. After adding or changing translatable text, run `vp run lingui:extract` to update `.po` files.
- The project uses `@lingui/vite-plugin`; do not run `vp run lingui:compile`. `pseudo` is for development/testing only (for example, RTL checks or long-text overflow checks), and must not be translated manually.

## Backend

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
vp test
vp run package
```

### Database Schema Changes

- For database schema changes, run `vp run db:generate` before verification and commit the generated migration files.

## Appendix

### Spec Maintenance

- Update `AGENTS.md` promptly whenever repository conventions or infrastructure are added or changed.
