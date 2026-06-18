# Acceptance Criteria: 用户消息Markdown渲染

**Spec:** `docs/superpowers/specs/2026-06-18-user-message-markdown-rendering-design.md`
**Date:** 2026-06-18
**Status:** Draft

---

## Criteria

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | 用户消息支持粗体文本渲染 | UI interaction | 开发服务器运行中，用户发送包含`**粗体**`的消息 | 用户消息中"粗体"文本显示为粗体格式 |
| AC-002 | 用户消息支持斜体文本渲染 | UI interaction | 开发服务器运行中，用户发送包含`*斜体*`的消息 | 用户消息中"斜体"文本显示为斜体格式 |
| AC-003 | 用户消息支持链接渲染 | UI interaction | 开发服务器运行中，用户发送包含`[链接](https://example.com)`的消息 | 用户消息中显示可点击的链接，链接文本为"链接" |
| AC-004 | 用户消息支持代码块渲染 | UI interaction | 开发服务器运行中，用户发送包含代码块的消息 | 用户消息中代码块显示为带语法高亮的代码块 |
| AC-005 | 用户消息支持数学公式渲染 | UI interaction | 开发服务器运行中，用户发送包含`$E=mc^2$`的消息 | 用户消息中数学公式正确渲染为KaTeX格式 |
| AC-006 | 用户消息支持Mermaid图表渲染 | UI interaction | 开发服务器运行中，用户发送包含Mermaid图表代码的消息 | 用户消息中Mermaid图表正确渲染为图表 |
| AC-007 | 用户消息支持表格渲染 | UI interaction | 开发服务器运行中，用户发送包含markdown表格的消息 | 用户消息中表格正确渲染为HTML表格 |
| AC-008 | 用户消息支持引用渲染 | UI interaction | 开发服务器运行中，用户发送包含`> 引用`的消息 | 用户消息中引用文本显示为blockquote格式 |
| AC-009 | 用户消息支持任务列表渲染 | UI interaction | 开发服务器运行中，用户发送包含`- [ ] 任务`的消息 | 用户消息中任务列表显示为checkbox列表 |
| AC-010 | 用户消息支持标题渲染 | UI interaction | 开发服务器运行中，用户发送包含`# 标题`的消息 | 用户消息中标题显示为相应的标题格式 |
| AC-011 | 用户消息支持无序列表渲染 | UI interaction | 开发服务器运行中，用户发送包含`- 项目`的消息 | 用户消息中无序列表显示为列表格式 |
| AC-012 | 用户消息支持有序列表渲染 | UI interaction | 开发服务器运行中，用户发送包含`1. 项目`的消息 | 用户消息中有序列表显示为带序号的列表格式 |
| AC-013 | 用户消息渲染效果与AI消息一致 | UI interaction | 开发服务器运行中，同时有用户消息和AI消息 | 用户消息和AI消息的markdown渲染样式完全一致 |
| AC-014 | AI消息渲染功能不受影响 | UI interaction | 开发服务器运行中，发送消息获取AI回复 | AI消息继续使用原来的markdown渲染，功能正常 |
| AC-015 | 空消息处理正常 | UI interaction | 开发服务器运行中，用户发送空消息 | 不会出现渲染错误或JavaScript错误 |
| AC-016 | 代码修改最小化 | Logic | 代码审查 | 仅修改`src/pages/chat/[id].vue`文件，不修改其他文件 |
| AC-017 | 向后兼容性 | Logic | 代码审查 | 不改变消息数据结构，不修改`useChat.ts` |
| AC-018 | 样式类正确应用 | Logic | 代码审查 | 用户消息容器使用`prose dark:prose-invert prose-sm max-w-none`类 |
| AC-019 | 流式渲染设置正确 | Logic | 代码审查 | `ChatMarkdownRenderer`组件的`streaming`prop设置为`false` |
| AC-020 | 空值处理正确 | Logic | 代码审查 | `markdown`prop使用`(message as any).parts[0]?.text || ''`处理空值 |