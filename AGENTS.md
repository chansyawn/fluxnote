# AGENTS.md

## Development Guidelines

- Use Vite+ as the primary toolchain.
- Do not modify shadcn components in `src/ui` unless explicitly requested.

## I18n Guidelines

- Use Lingui explicit IDs for all translatable text. Do not rely on auto-generated IDs; IDs must stay semantic and stable.
- After adding or changing translatable text, run `vp run lingui:extract` to update the `.po` files.
- The project uses `@lingui/vite-plugin`, so Vite compiles `.po` files into runtime format during development and build. Do not run `vp run lingui:compile`.
- `pseudo` is a pseudo-localized placeholder locale for development and debugging only. Do not translate it manually; use it only for testing scenarios such as RTL layout checks or long-text overflow.
