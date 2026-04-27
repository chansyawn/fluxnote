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

- Backend TypeScript code must follow Feature-First structure under `src/main/features`.
- Keep Electron main process as the single backend runtime entry and route backend commands through IPC handlers only.

### Database (Drizzle)

- Keep the SQLite schema and Drizzle runtime helpers under `src/main/features/database`.
- Database access is main-process only; do not introduce renderer-side database access.

### Error Model

- Backend IPC command errors must use a flat JSON payload:

```ts
{
  type: string
  message: string
  details: any
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

- Frontend sample pattern: `src/renderer/routes/sample/index.tsx`
- Backend sample pattern: `src/main/features/backend-commands.ts`

### Spec Maintenance

- Update `AGENTS.md` promptly whenever repository conventions or infrastructure are added or changed.
