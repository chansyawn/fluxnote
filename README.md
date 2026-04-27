# FluxNote

<p align="center">
  <img src="./src/assets/icons/icon.png" alt="FluxNote Logo" height="96" />
</p>

[English](./README.md) | [中文](./README.zh.md)

FluxNote is a lightweight, always-on-top editor designed for AI-first workflows.

It was built from a real daily problem: AI input boxes are rarely good at long prompt drafting, structured organization, and multi-round iteration. FluxNote acts as a lightweight drafting layer for AI workflows, especially for CLI agents while still fitting web chat tools.

## Why FluxNote

If you work with AI every day, prompt quality and iteration speed matter, but most AI input boxes are optimized for quick messages, not serious drafting.

That creates predictable friction:

- long prompts become hard to revise cleanly
- structure gets lost across iterations
- parallel tasks get mixed together in one document

FluxNote gives you a lightweight drafting pad before final submission to any AI tool:

- draft and polish long prompts comfortably
- separate parallel tasks with blocks instead of forcing everything into one document
- hand off refined input to CLI agents and web chat tools with less context switching

## Product Direction

FluxNote aims to be a lightweight, global, workflow-friendly Markdown / Block editor for AI work.

Core design goals:

- lightweight and fast for everyday use
- always available as a top-level utility
- optimized for prompt writing and handoff

## Features

### Available today

- **Lightweight always-on-top editing experience**
- **Block-based content organization** for clearer separation across parallel tasks
- **Auto-archive workflow** to keep active space clean
- **Markdown editing support** for structured prompt authoring
- **Command-line integration** for opening external edits from tools like Claude Code and Codex

### In progress / planned

- **Broader Markdown coverage** toward full syntax support
- **Browser integration** through plugins, URL schema, and Native Message
- **Smoother editing flow inside web AI tools**

## Use FluxNote as `$EDITOR` (Claude Code / Codex)

If you want Claude Code or Codex to open external edits in FluxNote, set your shell editor to:

```bash
export EDITOR="flux --edit"
```

To make it persistent:

```bash
echo 'export EDITOR="flux --edit"' >> ~/.zshrc
source ~/.zshrc
```

Then when Claude Code or Codex triggers an external editor flow, the target file will open in FluxNote for editing and submit/cancel handling.

If you prefer enabling this only for Codex / Claude commands (without changing global `EDITOR`), add aliases:

```bash
alias cdx='EDITOR="flux --edit" codex'
alias cld='EDITOR="flux --edit" claude'
```

Then use `cdx` or `cld` when you want FluxNote-backed external editing.

## Who It Is For

FluxNote is for builders, developers, and AI power users who:

- rely heavily on CLI agents (Codex, Claude Code, etc.) and need a better external editing experience
- use web chat AI tools but prefer drafting and structuring input before pasting
- work across multiple AI tools and want one lightweight place to draft and refine prompts

## Current Stage

FluxNote is under active early development.

Some capabilities are already usable, while others are being completed incrementally based on real usage feedback.
