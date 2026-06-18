# 用户消息Markdown渲染实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修改聊天UI，使用户消息支持完整的markdown渲染功能，与AI消息保持一致的处理方式。

**Architecture:** 仅修改`src/pages/chat/[id].vue`文件，将用户消息的纯文本渲染替换为现有的`ChatMarkdownRenderer`组件，设置`streaming=false`。

**Tech Stack:** Vue 3, markstream-vue, Tailwind CSS

---

## 文件结构

- **Modify:** `src/pages/chat/[id].vue` - 主要修改文件，替换用户消息渲染部分

## 任务分解

### Task 1: 修改用户消息渲染组件

**Files:**
- Modify: `src/pages/chat/[id].vue:634-641`

- [ ] **Step 1: 查看当前用户消息渲染代码**

查看`src/pages/chat/[id].vue`文件，找到用户消息渲染部分（第634-641行）。

```vue
<!-- 修改前（第634-641行） -->
<div v-if="message.role === 'user'" class="text-sm leading-relaxed">
  <div class="whitespace-pre-wrap break-words">
    {{ (message as any).parts[0]?.text }}
  </div>
</div>
```

- [ ] **Step 2: 替换为ChatMarkdownRenderer组件**

将用户消息渲染部分替换为使用`ChatMarkdownRenderer`组件。

```vue
<!-- 修改后 -->
<div v-if="message.role === 'user'" class="text-sm leading-relaxed">
  <ChatMarkdownRenderer
    :markdown="(message as any).parts[0]?.text || ''"
    :streaming="false"
    class="prose dark:prose-invert prose-sm max-w-none"
  />
</div>
```

- [ ] **Step 3: 验证代码修改**

检查修改后的代码是否正确：
1. 移除了`whitespace-pre-wrap break-words`类
2. 添加了空值处理：`(message as any).parts[0]?.text || ''`
3. 保持了外层容器结构不变
4. 使用了与AI消息相同的样式类

- [ ] **Step 4: 运行lint检查**

```bash
pnpm lint
```

Expected: 无错误，lint检查通过

- [ ] **Step 5: 运行typecheck检查**

```bash
pnpm typecheck
```

Expected: 无错误，typecheck检查通过

- [ ] **Step 6: 提交修改**

```bash
git add src/pages/chat/[id].vue
git commit -m "feat(chat): add markdown rendering for user messages"
```

### Task 2: 功能验证测试

**Files:**
- Test: 手动测试

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm dev
```

Expected: 开发服务器启动成功，无错误

- [ ] **Step 2: 测试基础markdown语法**

在浏览器中打开聊天界面，创建新会话，发送以下消息：
```
**粗体文本**
*斜体文本*
[链接文本](https://example.com)
```

Expected: 用户消息中显示粗体、斜体和可点击的链接

- [ ] **Step 3: 测试代码块渲染**

发送包含代码块的消息：
```javascript
function hello() {
  console.log('Hello, World!');
}
```

Expected: 代码块显示为带语法高亮的格式

- [ ] **Step 4: 测试数学公式渲染**

发送包含数学公式的消息：
```
$E=mc^2$
```

Expected: 数学公式正确渲染为KaTeX格式

- [ ] **Step 5: 测试列表渲染**

发送包含列表的消息：
```
- 项目1
- 项目2
- 项目3

1. 第一项
2. 第二项
3. 第三项
```

Expected: 无序列表和有序列表正确渲染

- [ ] **Step 6: 测试AI消息渲染不受影响**

发送消息获取AI回复，验证AI消息的markdown渲染功能正常。

Expected: AI消息继续使用原来的markdown渲染，功能正常

- [ ] **Step 7: 测试空消息处理**

发送空消息，验证不会出现渲染错误。

Expected: 空消息不显示内容，无JavaScript错误

- [ ] **Step 8: 验证样式一致性**

比较用户消息和AI消息的markdown渲染样式，确保完全一致。

Expected: 用户消息和AI消息的markdown渲染样式完全一致

- [ ] **Step 9: 提交测试结果**

```bash
git add .
git commit -m "test: verify user message markdown rendering"
```

## 验收标准映射

- **AC-001 to AC-012:** 通过Task 2的Step 2-5验证
- **AC-013:** 通过Task 2的Step 8验证
- **AC-014:** 通过Task 2的Step 6验证
- **AC-015:** 通过Task 2的Step 7验证
- **AC-016 to AC-020:** 通过Task 1的Step 3-5验证

## 回滚方案

如果出现问题，只需将代码改回原来的纯文本渲染：

```vue
<!-- 回滚代码 -->
<div v-if="message.role === 'user'" class="text-sm leading-relaxed">
  <div class="whitespace-pre-wrap break-words">
    {{ (message as any).parts[0]?.text }}
  </div>
</div>
```