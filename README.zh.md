# FluxNote

<p align="center">
  <img src="./src/assets/icons/icon.png" alt="FluxNote Logo" height="96" />
</p>

[English](./README.md) | [中文](./README.zh.md)

FluxNote 是一个面向 AI 工作流的轻量级全局置顶编辑器。

它源于一个真实的日常痛点：现有 AI 输入框并不适合长 prompt 打草稿、结构化整理和多轮迭代。FluxNote 是一层轻量的输入“草稿纸”，优先面向 CLI agent 场景优化，同时也适配网页 chat 工具。

## 为什么做 FluxNote

如果你每天都在和 AI 协作，prompt 的质量与迭代速度会直接影响产出。但大多数 AI 输入框更适合“快速发一句”，不适合“认真打磨输入”。

这会带来几个典型问题：

- 长 prompt 难以高质量修改
- 多轮迭代后结构容易混乱
- 并行任务容易被挤在同一份文档里，边界不清晰

FluxNote 提供一个提交前的轻量草稿层，用来：

- 更舒适地编写和修改长 prompt
- 用 block 区分并行任务，而不是塞进单一文档
- 以更低成本把打磨后的输入流转到 CLI agent 和网页 chat 工具

## 产品方向

FluxNote 的目标是成为一个轻量、全局可用、适合 AI 工作流的 Markdown / Block 编辑器。

核心设计目标：

- 轻量快速，适合高频日常使用
- 全局置顶，随时可用
- 围绕 prompt 的编写与流转体验进行优化

## 功能概览

### 当前已支持

- **轻量全局置顶编辑体验**
- **基于 block 的内容组织**，便于并行任务清晰区分
- **自动归档流程**，帮助保持当前工作区整洁
- **Markdown 编辑支持**，用于结构化 prompt 编写
- **命令行集成**，可从 Claude Code、Codex 等工具一键打开外部编辑

### 开发中 / 规划中

- **更完整的 Markdown 语法覆盖**
- **浏览器侧集成能力**（插件、URL schema、Native Message）
- **网页 AI 工具中的编辑体验优化**

## 配置为 `$EDITOR`（Claude Code / Codex）

如果你希望 Claude Code 或 Codex 的外部编辑流程直接打开 FluxNote，可以在 shell 中设置：

```bash
export EDITOR="flux --edit"
```

如果希望长期生效：

```bash
echo 'export EDITOR="flux --edit"' >> ~/.zshrc
source ~/.zshrc
```

完成后，当 Claude Code 或 Codex 触发外部编辑时，目标文件会在 FluxNote 中打开，并支持提交/取消回写流程。

如果你只想对 Codex / Claude 单独启用（不修改全局 `EDITOR`），可以加别名：

```bash
alias cdx='EDITOR="flux --edit" codex'
alias cld='EDITOR="flux --edit" claude'
```

之后使用 `cdx` 或 `cld` 启动即可。

## 适合谁使用

FluxNote 适合这类用户：

- 重度依赖 CLI agent（如 Codex、Claude Code），需要更好外部编辑体验的用户
- 使用网页 chat 类 AI 工具，但希望先打草稿、再提交的用户
- 同时使用多种 AI 工具，需要统一草稿与打磨入口的用户

## 当前阶段

FluxNote 仍处于早期持续开发阶段。

部分能力已可使用，部分能力会基于真实使用反馈持续完善。
