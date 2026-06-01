# Acceptance Criteria: 输入缓存功能

**Spec:** `docs/superpowers/specs/2026-06-01-input-cache-design.md`
**Date:** 2026-06-01
**Status:** Draft

---

## Criteria

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | 用户在会话A输入内容后刷新页面，内容自动恢复 | UI interaction | 会话A存在，用户打开会话A | 1. 用户在输入框输入"测试内容"<br>2. 等待500ms防抖完成<br>3. 刷新页面<br>4. 输入框显示"测试内容" |
| AC-002 | 多会话输入内容独立缓存 | UI interaction | 存在会话A和会话B | 1. 在会话A输入"内容A"，等待500ms<br>2. 切换到会话B输入"内容B"，等待500ms<br>3. 刷新页面<br>4. 切换到会话A，输入框显示"内容A"<br>5. 切换到会话B，输入框显示"内容B" |
| AC-003 | 发送消息后清除该会话缓存 | UI interaction | 会话A存在，输入框有缓存内容 | 1. 在会话A输入"待发送内容"，等待500ms<br>2. 点击发送按钮<br>3. 消息发送成功<br>4. 刷新页面<br>5. 输入框为空 |
| AC-004 | 删除会话时清除该会话缓存 | UI interaction | 会话A存在，输入框有缓存内容 | 1. 在会话A输入"待删除内容"，等待500ms<br>2. 删除会话A<br>3. 重新创建会话A（相同ID）<br>4. 输入框为空 |
| AC-005 | 防抖机制正常工作 | Logic | useInputCache composable 已实现 | 1. 连续快速输入多个字符<br>2. 只有最后一次输入停止500ms后才保存<br>3. localStorage中只有最终文本 |
| AC-006 | localStorage存储失败时静默处理 | Logic | localStorage存储空间已满或不可用 | 1. 模拟localStorage存储失败<br>2. 控制台显示警告日志"[InputCache] 保存失败:"<br>3. 输入框正常显示，不影响用户输入 |
| AC-007 | 页面加载时自动恢复缓存 | UI interaction | 会话A存在，有缓存内容 | 1. 打开会话A<br>2. 页面加载完成<br>3. 输入框自动显示缓存内容<br>4. 无需用户操作 |
| AC-008 | 与现有savePendingMessage机制共存 | Logic | useChat.ts中的savePendingMessage存在 | 1. 用户发送消息<br>2. savePendingMessage保存到sessionStorage<br>3. useInputCache保存到localStorage<br>4. 两者键名不同，互不干扰 |