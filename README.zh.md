# Fluxnotes

![Fluxnotes](./src/assets/banner.png)

<p align="center">
  <img alt="License" src="https://img.shields.io/github/license/chansyawn/fluxnotes" />
  <a href="https://github.com/chansyawn/fluxnotes/releases"><img alt="Release" src="https://img.shields.io/github/v/release/chansyawn/fluxnotes?sort=semver&display_name=tag" /></a>
  <a href="https://github.com/chansyawn/fluxnotes/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/chansyawn/fluxnotes/total" /></a>
</p>

<p align="center">
  <a href="./README.md">English</a> | 简体中文
</p>

Fluxnotes 是一个适合 AI 时代工作流的轻量[^lightweight]全局置顶 Markdown Block 编辑器。

它不是另一个知识库，也不是完整的 Markdown 编辑器，而是一个随时可见的上下文暂存区：每个 Block 都是一段可独立编辑、整理和归档的输入草稿。

- **打磨输入**：先组织和修改较长内容，再交给 Chat、CLI Agent 或其他输入框。
- **整理上下文**：在多任务、多窗口切换时，保存临时工作内容。
- **临时记录**：记录灵感、片段和待处理内容，之后再沉淀到更正式的知识库或文档。

## 开始

前往 [GitHub Releases](https://github.com/chansyawn/fluxnotes/releases) 下载最新版。

> Fluxnotes 仍处于早期开发阶段，可能存在不稳定或体验不完整的地方。欢迎通过 [Issues](https://github.com/chansyawn/fluxnotes/issues) 反馈问题和建议[^feedback]。

## 特点

- **全局置顶**：作为一个始终可见的置顶编辑窗口存在，在浏览器、IDE、终端、文档和多个 AI 工具之间切换时，它可以作为当前工作的上下文暂存区。
- **自动归档**：自动把不再活跃的 Block 移出当前工作区，减少长期并行任务带来的堆积。
- **WYSIWYG Markdown**：用接近所见即所得的方式写 Markdown，适合打磨结构化 prompt。
- **输入流转**：通过 `flux` CLI 打开应用、创建 Block，或作为外部编辑器接入 Codex / Claude Code 等 CLI Agent。后续会继续探索更多唤起和传递方式。

## 用法

### 安装 Flux CLI

打开 Fluxnotes 的「偏好设置」，在「App」分区找到「Flux CLI」并点击安装。安装后可以在终端运行：

```bash
flux --help
```

查看当前可用命令与参数。

### 配合 Codex / Claude Code 使用

推荐用 alias 只为 Codex / Claude Code 启用 Fluxnotes：

```bash
alias cdx='EDITOR="flux edit" codex'
alias cld='EDITOR="flux edit" claude'
```

之后使用 `cdx` 或 `cld` 启动工具。当它们进入外部编辑流程时，会在 Fluxnotes 中打开待编辑内容。你可以在 Fluxnotes 里打磨输入，再提交或取消这次编辑。

不建议直接把 `EDITOR="flux edit"` 设置成全局默认编辑器。全局 `EDITOR` 会影响 Git、shell 和其他 CLI 工具的编辑行为。

### 从终端创建内容

```bash
flux
flux add "整理这次任务的上下文和下一步"
flux add --file prompt.md --tag codex
```

- `flux`：打开 Fluxnotes。
- `flux add "..."`：从行内文本创建一个 Block。
- `flux add --file prompt.md --tag codex`：从 UTF-8 文本文件创建 Block，并添加 Tag。

## 为什么创建 Fluxnotes

大多数 AI 应用都通过对话交互：网页 Chat、桌面 Chat、CLI Agent。它们的输入框通常很适合“快速发一句”，却不适合认真打磨一段结构化输入。

与此同时，AI 极大提高了工作的并行度。多个工具、多个工程、多个任务会频繁插入和打断，人类也需要一个集中的地方整理自己的「上下文」。

Fluxnotes 试图解决的就是这个中间层问题：在正式提交给 AI 之前，先有一个轻量、始终可见、适合反复修改的输入工作区。

## 后续规划

- 更完整的 Markdown 语法支持和更好的输入体验。
- 更便捷的输入流转：探索 Accessibility API、浏览器插件等方式，从各种输入框中唤起 Fluxnotes，或将内容直接传递给不同 AI 应用。

## 另一种选择

如果你觉得 Fluxnotes 现阶段还不够成熟稳定，可以先试试 [Raycast Notes](https://www.raycast.com/core-features/notes)。它是 Fluxnotes 的灵感来源，更加成熟，也更加简洁克制。

[^lightweight]: 这里的“轻量”指产品形态和使用方式轻量。Fluxnotes 基于 Electron 构建，技术栈本身并不轻量。

[^feedback]: 很抱歉，当前阶段暂不接受 PR。项目仍在快速探索产品方向和内部架构，过早引入外部贡献可能会增加维护成本。
