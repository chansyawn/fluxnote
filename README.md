# Fluxnotes

![Fluxnotes](./docs/readme/assets/banner.png)

<p align="center">
  <img alt="License" src="https://img.shields.io/github/license/chansyawn/fluxnotes" />
  <a href="https://github.com/chansyawn/fluxnotes/releases"><img alt="Release" src="https://img.shields.io/github/v/release/chansyawn/fluxnotes?sort=semver&display_name=tag" /></a>
  <a href="https://github.com/chansyawn/fluxnotes/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/chansyawn/fluxnotes/total" /></a>
  <a href="https://linux.do"><img alt="LINUX DO" src="https://shorturl.at/ggSqS" /></a>
</p>

<p align="center">
  English | <a href="./docs/readme/README.zh.md">中文</a>
</p>

Fluxnotes is a lightweight[^lightweight], always-on-top Markdown Block editor for AI-era workflows.

It is not another knowledge base, and it is not a full Markdown editor. It is a visible context buffer: each Block is an input draft that can be edited, organized, and archived independently.

- **Refine input**: organize and revise longer text before sending it to chat tools, CLI agents, or other input boxes.
- **Organize context**: keep temporary working context while switching between tasks, windows, and tools.
- **Capture temporary**: save ideas, snippets, and pending items before moving them into a more formal knowledge base or document.

## Install

Download the latest version from [GitHub Releases](https://github.com/chansyawn/fluxnotes/releases). Fluxnotes currently supports macOS and Windows.

> Fluxnotes is still in early development. Some parts may be unstable or incomplete. Issues and suggestions are welcome on [GitHub Issues](https://github.com/chansyawn/fluxnotes/issues)[^feedback].

## Features

- **Always on top**: stays visible while you move between browsers, IDEs, terminals, documents, and AI tools, acting as a temporary context buffer for the current work.
- **Auto archive**: automatically moves inactive Blocks out of the active Workspace to reduce buildup from long-running parallel tasks.
- **WYSIWYG Markdown**: write Markdown in a close-to-what-you-see-is-what-you-get editing experience for structured prompts.
- **Input handoff**: start External edit from the active Mac App input field on macOS, or use the `flux` CLI to open Fluxnotes, create Blocks, and connect CLI agents such as Codex and Claude Code.

## Usage

### Daily Usage

Using shortcuts is strongly recommended for controlling the window, Block actions, and editing actions. Fluxnotes is an always-on-top temporary workspace, and shortcuts reduce context switching between the mouse, input boxes, and different apps.

- `Alt/Option+N`: show or hide the Fluxnotes window.
- More window, Block, and editor shortcuts can be viewed and customized in Fluxnotes Preferences.

### Input Handoff Examples

| Mac App input field                                                                                                          | Web input field                                                                                                          | CLI Agent                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| <img src="./docs/readme/assets/use-with-app.gif" alt="Use Fluxnotes External edit from a Mac App input field" width="240" /> | <img src="./docs/readme/assets/use-with-web.gif" alt="Use Fluxnotes External edit from a Web input field" width="240" /> | <img src="./docs/readme/assets/use-with-cli.gif" alt="Use Fluxnotes External edit with a CLI Agent" width="240" /> |

### Edit From Mac App Input Fields

External edit currently supports macOS only. Before first use, grant Accessibility permission in Fluxnotes Preferences under External edit.

Place the cursor in the target app's input field and press `Command+Option+N`; Fluxnotes opens the current input as a Block. When finished, submit with the button or `Command+Enter`; cancel with `Command+\`. If the target input cannot be written back directly, Fluxnotes copies the result to the clipboard instead. Secure fields such as password inputs cannot be read or written back. Related shortcuts can be changed in Shortcuts.

### Use Flux CLI

Open Fluxnotes Preferences, go to the App section, find Flux CLI, and click Install. After installation, run `flux --help` to view available commands and options.

#### Use With Codex / Claude Code

Enable Fluxnotes only for Codex / Claude Code with shell aliases or functions.

For macOS/Linux shells:

```bash
alias cdx='EDITOR="flux edit" codex'
alias cld='EDITOR="flux edit" claude'
```

For Windows PowerShell, add functions like these to your PowerShell profile:

```powershell
function cdx {
  $oldEditor = $env:EDITOR
  $env:EDITOR = "flux edit"
  try { codex @args } finally {
    if ($null -eq $oldEditor) { Remove-Item Env:EDITOR -ErrorAction SilentlyContinue }
    else { $env:EDITOR = $oldEditor }
  }
}

function cld {
  $oldEditor = $env:EDITOR
  $env:EDITOR = "flux edit"
  try { claude @args } finally {
    if ($null -eq $oldEditor) { Remove-Item Env:EDITOR -ErrorAction SilentlyContinue }
    else { $env:EDITOR = $oldEditor }
  }
}
```

For Windows Command Prompt, use `doskey` macros:

```bat
doskey cdx=cmd /C "set EDITOR=flux edit&& codex $*"
doskey cld=cmd /C "set EDITOR=flux edit&& claude $*"
```

Start the CLI agent with `cdx` or `cld`. In Codex / Claude Code, press the default external-editor shortcut `Ctrl+G`; the wrapper sends the draft to Fluxnotes through `EDITOR="flux edit"`.

Revise it in Fluxnotes, then submit or cancel to return to the CLI agent.

Avoid setting `EDITOR="flux edit"` globally; it also affects Git, shell commands, and other CLI tools.

#### Create Content From the Terminal

```bash
flux
flux add "Summarize the current task context and next step"
flux add --text "Summarize the current task context and next step"
flux add --file prompt.md --tag codex
flux edit prompt.md
```

- `flux`: open Fluxnotes.
- `flux add "..."`: create a Block from inline text.
- `flux add --text "..."`: explicitly create a Block from inline text.
- `flux add --file prompt.md --tag codex`: create a Block from a UTF-8 text file and add a Tag.
- `flux edit prompt.md`: hand a file-backed external editing draft to Fluxnotes, then submit or cancel to return to the caller.

## Why Fluxnotes

Most AI products are conversational: web chat, desktop chat, CLI agents. Their input boxes are usually great for sending a quick message, but not for carefully shaping structured input.

At the same time, AI increases how much work can happen in parallel. Multiple tools, projects, and tasks interrupt each other often, and people need one place to organize their own context.

Fluxnotes focuses on that middle layer: before sending something to an AI tool, you get a lightweight, visible Workspace for drafting and iteration.

## Privacy And Local Data

Fluxnotes stores user data in `~/.flux`. To fully uninstall Fluxnotes, or to reset local state when the app cannot start, delete this folder. This removes local Blocks, settings, and Flux CLI files managed by the app.

Fluxnotes includes a telemetry setting that can be turned off. Telemetry helps understand feature usage and diagnose issues. You can disable it in Preferences.

## Roadmap

- Broader Markdown syntax support and a better editing experience.
- Smoother input handoff: keep exploring more input contexts for launching Fluxnotes or sending content directly to different AI apps.

## Alternative

If Fluxnotes is not mature or stable enough for you yet, try [Raycast Notes](https://www.raycast.com/core-features/notes). It inspired Fluxnotes and is more mature, simpler, and more restrained.

[^lightweight]: "Lightweight" here refers to the product shape and workflow. Fluxnotes is built with Electron, so the underlying stack itself is not lightweight.

[^feedback]: Sorry, external PRs are not accepted at this stage. The product direction and internal architecture are still changing quickly, and accepting external contributions too early would add maintenance overhead.
