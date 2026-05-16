# AGENTS.md

## General (Common)

### Architecture

- Use **Vite+** as the primary toolchain.

### File Organization

```bash
src/
  main/
    app/                  # app assembly: bootstrap, runtime composition, IPC registration, backend command surface
      bootstrap.ts
      runtime.ts
      protocols.ts
      backend-commands.ts
    core/                 # platform core shared by backend features
      database/
      features/
      ipc/                # backend IPC router/event bus
        create-ipc-router.ts
        register-ipc.ts
        event-bus.ts
      persistence/
    features/             # feature-first backend domains
      <feature>/
        index.ts          # stable feature export
        command.ts        # IPC command registration and routing only
        service.ts        # feature business logic + data access (default)
        *.test.ts         # colocated tests when feature-scoped

  renderer/
    clients/
      index.ts          # renderer-facing public entry; consumer imports from @renderer/clients
      ipc/
        invoke.ts       # invokeCommand / subscribeEvent / AppInvokeError
        events.ts       # cross-feature event subscriptions
      *.ts              # feature client implementation, no "-api" suffix
    app/                  # renderer bootstrapping and global cross-feature content
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
    features/             # cross-process feature contracts and DTO schemas
      <feature>/
        contract.ts       # required: commands/events schema (single source of truth)
        models.ts         # optional: shared DTO schemas
        *.ts              # optional domain helpers (如 settings.ts)
    ipc/
      result.ts           # IpcResult + IpcError
      types.ts            # contracts aggregation + typed command/event inference
```

- Use `kebab-case` file names by default.

## Frontend

### UI Conventions

- Use the shadcn CLI to create new components when appropriate.
- Do not modify existing shadcn components in `src/renderer/ui` unless explicitly requested.
- Use `lucide-react` for icons, and name icon wrappers with an `Icon` suffix.
- Design and test with RTL behavior in mind.

### I18n (Lingui)

- Use Lingui explicit IDs for all translatable text; IDs must stay semantic and stable. After adding or changing translatable text, run `vp run i18n:extract` to update `.po` files.
- Run `vp run i18n:check` to verify catalogs are current and shipped locales have no missing translations. `vp staged` runs this for renderer source, locale catalog, and Lingui config changes.
- The project uses `@lingui/vite-plugin`; do not compile catalogs manually. `pseudo` is for development/testing only (for example, RTL checks or long-text overflow checks), and must not be translated manually.

## Backend

### Database (Drizzle)

- Keep the SQLite schema and Drizzle runtime helpers under `src/main/core/database`.
- Database access is main-process only; do not introduce renderer-side database access.

### Error Model

- Backend IPC command errors must use a flat JSON payload:

```ts
{
  code: string;
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

## Test

- Use the Arrange-Act-Assert structure for readability.
- Tests must be isolated and must not depend on execution order or shared state.
- Use descriptive test names, preferably following `action state expected` or `given when then`.
- Add comments only when they clarify non-obvious intent or setup.
- Use `vp test --coverage` as a reference, not as the primary quality target.

## Appendix

### Spec Maintenance

- Update `AGENTS.md` promptly whenever repository conventions or infrastructure are added or changed.
