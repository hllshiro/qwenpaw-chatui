# 系统提示词和强调指令 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在设置-高级-系统中增加"系统提示词"和"强调指令"选项，控制发送给后端的消息内容

**Architecture:** 在 settings 注册系统中新增两个配置项，在 useChat.ts 的 doFetch 函数中读取配置并追加 system 消息到请求体

**Tech Stack:** Vue 3 Composition API, TypeScript, vue-i18n

## Global Constraints

- 所有界面文本必须使用 `$t()` 函数，禁止硬编码
- 翻译键命名规范：`settings.advanced.system.*`
- 2 空格缩进，LF 换行符
- 遵循现有代码风格和模式

---

### Task 1: 添加翻译文本

**Files:**
- Modify: `src/locales/zh-CN/settings.json`
- Modify: `src/locales/en/settings.json`

- [ ] **Step 1: 添加中文翻译**

在 `settings.json` 的 `advanced` 对象中，在 `upload` 之后添加 `system` 分组：

```json
"system": {
  "label": "系统",
  "systemPrompt": "系统提示词",
  "systemPromptDescription": "如果非空，在每个新会话的首条用户消息中追加系统提示",
  "emphasisInstruction": "强调指令",
  "emphasisInstructionDescription": "开启后，在用户的每条消息中都追加系统指令"
}
```

- [ ] **Step 2: 添加英文翻译**

在 `en/settings.json` 的 `advanced` 对象中，在 `upload` 之后添加 `system` 分组：

```json
"system": {
  "label": "System",
  "systemPrompt": "System Prompt",
  "systemPromptDescription": "If not empty, append system prompt to the first user message in each new session",
  "emphasisInstruction": "Emphasis Instruction",
  "emphasisInstructionDescription": "When enabled, append system instruction to every user message"
}
```

- [ ] **Step 3: 验证 JSON 格式**

运行: `node -e "JSON.parse(require('fs').readFileSync('src/locales/zh-CN/settings.json'))"` 和 `node -e "JSON.parse(require('fs').readFileSync('src/locales/en/settings.json'))"`

Expected: 无输出（JSON 格式正确）

---

### Task 2: 注册设置项

**Files:**
- Modify: `src/composables/settings/definitions.ts`

**Interfaces:**
- Produces: `advanced.system.systemPrompt` (string, default: '')
- Produces: `advanced.system.emphasisInstruction` (boolean, default: false)

- [ ] **Step 1: 注册 system 分组**

在 `definitions.ts` 第 19 行（`upload` 分组注册之后）添加：

```typescript
registerGroup({ key: 'system', label: '系统', labelKey: 'settings.advanced.system.label', category: 'advanced' })
```

- [ ] **Step 2: 注册系统提示词配置项**

在文件末尾（第 385 行之后）添加：

```typescript
// === 注册配置项 - 高级 - 系统 ===
registerSetting({
  key: 'advanced.system.systemPrompt',
  label: '系统提示词',
  labelKey: 'settings.advanced.system.systemPrompt',
  description: '如果非空，在每个新会话的首条用户消息中追加系统提示',
  descriptionKey: 'settings.advanced.system.systemPromptDescription',
  type: 'input',
  defaultValue: '',
  category: 'advanced',
  group: 'system',
  advanced: true,
  icon: 'i-lucide-message-square',
  placeholder: '输入系统提示词...',
})
```

- [ ] **Step 3: 注册强调指令配置项**

紧接着添加：

```typescript
registerSetting({
  key: 'advanced.system.emphasisInstruction',
  label: '强调指令',
  labelKey: 'settings.advanced.system.emphasisInstruction',
  description: '开启后，在用户的每条消息中都追加系统指令',
  descriptionKey: 'settings.advanced.system.emphasisInstructionDescription',
  type: 'switch',
  defaultValue: false,
  category: 'advanced',
  group: 'system',
  advanced: true,
  icon: 'i-lucide-alert-triangle',
})
```

- [ ] **Step 4: 验证类型检查**

运行: `pnpm typecheck`

Expected: 无类型错误

---

### Task 3: 修改消息发送逻辑

**Files:**
- Modify: `src/composables/useChat.ts`

**Interfaces:**
- Consumes: `advanced.system.systemPrompt` (string)
- Consumes: `advanced.system.emphasisInstruction` (boolean)

- [ ] **Step 1: 导入 useSettings**

在 `useChat.ts` 文件顶部的导入语句之后，添加对 useSettings 的引用（由于自动导入，可能不需要显式导入，但需要在函数内部调用）。

- [ ] **Step 2: 修改 doFetch 函数**

在 `doFetch` 函数中（第 269-352 行），在构造 `requestBody` 之前，读取设置并构建 system 消息：

```typescript
async function doFetch(messageText: string, onComplete?: () => void, onDone?: () => void, attachments?: SendMessagePayload['attachments']) {
  state.abortController = new AbortController()
  state.stopRequested = false
  
  try {
    // 读取系统提示词和强调指令设置
    const settings = useSettings()
    const systemPrompt = settings.getValue('advanced.system.systemPrompt') as string
    const emphasisInstruction = settings.getValue('advanced.system.emphasisInstruction') as boolean
    
    // 构建 messages 数组
    const messagesArray: Array<{ role: string; content: string }> = []
    
    // 系统提示词：仅在会话首条消息时追加
    if (systemPrompt?.trim() && messages.value.length === 0) {
      messagesArray.push({ role: 'system', content: systemPrompt.trim() })
    }
    
    // 强调指令：每条消息都追加
    if (emphasisInstruction && systemPrompt?.trim()) {
      messagesArray.push({ role: 'system', content: systemPrompt.trim() })
    }
    
    // 添加用户消息
    messagesArray.push({ role: 'user', content: messageText })
    
    const requestBody = {
      messages: messagesArray,
      ...(attachments?.length ? { attachments } : {})
    }

    // ... 其余代码保持不变
```

- [ ] **Step 3: 验证类型检查**

运行: `pnpm typecheck`

Expected: 无类型错误

- [ ] **Step 4: 运行 lint 检查**

运行: `pnpm lint`

Expected: 无 lint 错误

- [ ] **Step 5: 提交代码**

```bash
git add src/composables/settings/definitions.ts src/composables/useChat.ts src/locales/zh-CN/settings.json src/locales/en/settings.json
git commit -m "feat(settings): 新增系统提示词和强调指令功能"
```
