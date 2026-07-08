<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { $fetch } from "ofetch";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSessions } from "@/composables/useSessions";
import { useSettings } from "@/composables/settings";
import { useFileUpload } from "@/composables/useFileUpload";
import {
  useChat,
  type ChatMessage,
  type MessageBlock,
} from "@/composables/useChat";
import { useApprovalState } from "@/composables/useApprovalState";
import type { ContentPart } from "@/types/content";
import Navbar from "@/components/Navbar.vue";
import ChatMarkdownRenderer from "@/components/chat/MarkdownRenderer";
import AttachmentPreview from "@/components/chat/AttachmentPreview.vue";

const route = useRoute<"/chat/[id]">();
const { t } = useI18n();
const { updateSession, sessions, businessKey } = useSessions();

const sessionId = route.params.id as string;

const { getValue } = useSettings();

const {
  attachments,
  isUploading,
  addFiles,
  removeFile,
  retryFile,
  clearAll,
  getReadyAttachments,
} = useFileUpload({
  maxFiles: Number(getValue("advanced.upload.maxFiles")) || 5,
  maxSizeMB: Number(getValue("advanced.upload.maxSizeMB")) || 20,
});

const sessionData = ref<any>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const [data, history, qwenpawChat] = await Promise.all([
      $fetch(`/api/chats/${sessionId}`),
      $fetch(`/api/chats/${sessionId}/history`).catch(() => ({
        messages: [],
        status: "idle",
      })),
      $fetch(`/api/chats/spec?session_id=${sessionId}`).catch(() => null),
    ]);

    sessionData.value = data;

    const backendName = qwenpawChat?.name;
    if (backendName && backendName !== data?.name) {
      updateSession(sessionId, { name: backendName });
    }

    if (messages.value.length > 0) {
      const initialMsg = route.query.msg as string | undefined;
      if (initialMsg?.trim()) {
        if (window.history.replaceState) {
          window.history.replaceState({}, "", `/chat/${sessionId}`);
        }
        await sendMessage(initialMsg.trim());
        syncBackendTitle();
      }
      return;
    }

    // 检查是否有从首页传递的待处理附件
    const pendingAttachmentsKey = `qwenpaw_pending_attachments_${sessionId}`;
    const pendingAttachmentsData = sessionStorage.getItem(pendingAttachmentsKey);
    if (pendingAttachmentsData) {
      try {
        const { text, attachments } = JSON.parse(pendingAttachmentsData);
        sessionStorage.removeItem(pendingAttachmentsKey);
        if (window.history.replaceState) {
          window.history.replaceState({}, "", `/chat/${sessionId}`);
        }
        await sendMessage({ text, attachments }, { onComplete: syncBackendTitle });
        return;
      } catch (e) {
        console.error("[ChatPage] Failed to parse pending attachments:", e);
      }
    }

    const generating = history?.status === "running";

    if (history?.messages?.length > 0) {
      loadHistoryMessages(history.messages);
      applyDefaultExpandSettings();
      if (generating) {
        patchPendingUserMessage(true);
      } else {
        patchPendingUserMessage(false);
      }
    } else if (generating) {
      patchPendingUserMessage(true);
      reconnect({ onComplete: syncBackendTitle });
    }

    const initialMsg = route.query.msg as string | undefined;
    if (initialMsg?.trim()) {
      if (window.history.replaceState) {
        window.history.replaceState({}, "", `/chat/${sessionId}`);
      }
      await sendMessage(initialMsg.trim(), { onComplete: syncBackendTitle });
    }
  } catch (err) {
    console.error("[ChatPage] Failed to load:", err);
  } finally {
    loading.value = false;
  }
});

function loadHistoryMessages(historyMessages: any[]) {
  const turns: any[][] = [];
  let i = 0;
  while (i < historyMessages.length) {
    if (historyMessages[i].role === "user") {
      turns.push([historyMessages[i++]]);
    } else {
      const group: any[] = [];
      while (i < historyMessages.length && historyMessages[i].role !== "user") {
        group.push(historyMessages[i++]);
      }
      if (group.length) turns.push(group);
    }
  }

  for (const msgs of turns) {
    const userMsg = msgs.find((m: any) => m.role === "user");
    if (userMsg) {
      const parts = parseContentParts(userMsg.content)
      const { textParts, attachmentBlocks } = processUserContentParts(parts)

      const content = textParts.join('')
      if (content || attachmentBlocks.length > 0) {
        messages.value.push({
          id: userMsg.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "user",
          content,
          blocks: attachmentBlocks,
          timestamp: userMsg.created_at
            ? new Date(userMsg.created_at).getTime()
            : Date.now(),
        })
      }
    }

    const blocks: MessageBlock[] = [];
    const seenApprovalRequestIds = new Set<string>();

    for (const msg of msgs) {
      if (msg.type === "reasoning") {
        const text = extractContent(msg.content);
        if (text) {
          blocks.push({
            id: msg.id || `blk-${Date.now()}-reasoning`,
            type: "reasoning",
            text,
          });
        }
        continue;
      }

      if (
        msg.type === "message" &&
        msg.role === "assistant" &&
        msg.metadata?.message_type !== "tool_guard_approval"
      ) {
        const text = extractContent(msg.content);
        if (text) {
          blocks.push({
            id: msg.id || `blk-${Date.now()}-text`,
            type: "text",
            text,
          });
        }
        continue;
      }

      if (msg.type === "plugin_call") {
        const dataPart = Array.isArray(msg.content)
          ? msg.content.find((p: any) => p.type === "data")
          : null;
        const data = dataPart?.data || {};

        const outputMsg = msgs.find((om: any) => {
          if (om.type !== "plugin_call_output") return false;
          const outData = Array.isArray(om.content)
            ? om.content.find((p: any) => p.type === "data")?.data
            : null;
          return outData?.call_id === data.call_id;
        });
        const outputData =
          outputMsg && Array.isArray(outputMsg.content)
            ? outputMsg.content.find((p: any) => p.type === "data")?.data
            : null;

        blocks.push({
          id: msg.id || `blk-${Date.now()}-tool`,
          type: "toolCall",
          toolCall: {
            id: data.call_id || `call-${Date.now()}`,
            name: data.name || "",
            args: data.arguments,
            result: outputData?.output || null,
          },
        });
        continue;
      }

      if (msg.metadata?.message_type === "tool_guard_approval") {
        const meta = msg.metadata;
        const requestId = meta?.approval_request_id || "";
        if (requestId && seenApprovalRequestIds.has(requestId)) continue;
        if (requestId) seenApprovalRequestIds.add(requestId);

        blocks.push({
          id: msg.id || `blk-${Date.now()}-approval`,
          type: "approval",
          approval: {
            requestId,
            toolName: meta?.tool_name || "",
            severity: meta?.severity || "",
            findingsSummary: meta?.findings_summary || "",
            toolParams: meta?.tool_params,
            status: "pending",
          },
        });
        continue;
      }
    }

    if (blocks.length > 0) {
      const contentText = blocks
        .filter((b) => b.type === "text")
        .map((b) => b.text || "")
        .join("");

      const assistantMsg = msgs.find(
        (m: any) => m.type === "message" && m.role === "assistant",
      );
      const reasoningMsg = msgs.find((m: any) => m.type === "reasoning");

      messages.value.push({
        id:
          assistantMsg?.id ||
          reasoningMsg?.id ||
          `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "assistant",
        content: contentText,
        blocks,
        timestamp: (assistantMsg || reasoningMsg)?.created_at
          ? new Date((assistantMsg || reasoningMsg).created_at).getTime()
          : Date.now(),
      });
    }
  }
}

function extractContent(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p.type === "text" && p.text)
      .map((p: any) => p.text)
      .join("");
  }
  return "";
}

 
function parseContentParts(content: unknown): ContentPart[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (!Array.isArray(content)) {
    return [{ type: 'text', text: String(content || '') }]
  }
  return content as ContentPart[]
}

 
function isSystemFilepathText(text: string, parts: ContentPart[], currentIndex: number): boolean {
  if (currentIndex > 0) {
    const prevType = parts[currentIndex - 1].type
    if (prevType === 'file' || prevType === 'image' || prevType === 'video') {
      return true
    }
  }
  // 使用 i18n 键值检测系统文件路径文本
  const userUploadText = t('chat.systemFilepath.userUploadFile')
  const downloadedToText = t('chat.systemFilepath.downloadedTo')
  if (text.includes(userUploadText) || text.includes(downloadedToText)) {
    return true
  }
  return false
}

 
function processUserContentParts(parts: ContentPart[], startCounter: number = 0): {
  textParts: string[]
  attachmentBlocks: MessageBlock[]
} {
  const textParts: string[] = []
  const attachmentBlocks: MessageBlock[] = []
  let localCounter = startCounter

  let i = 0
  while (i < parts.length) {
    const part = parts[i]

    if (part.type === 'text' && part.text) {
      if (isSystemFilepathText(part.text, parts, i)) {
        i++
        continue
      }
      textParts.push(part.text)
    } else if (part.type === 'file' || part.type === 'image' ||
               part.type === 'audio' || part.type === 'video') {
      localCounter++
      const blockId = `att-${localCounter}-${Date.now()}`
      const block: MessageBlock = {
        id: blockId,
        type: 'attachment',
        attachment: {
          type: part.type as 'image' | 'file' | 'audio' | 'video',
          url: part.file_url || part.image_url || part.audio_url || part.data || part.video_url || '',
          name: part.filename || part.file_name || ''
        }
      }
      attachmentBlocks.push(block)
    }

    i++
  }

  return { textParts, attachmentBlocks }
}

const sessionName = computed(() => {
  const session = sessions.value.find((s) => s.id === sessionId);
  return session?.name || t("chat.newSession");
});

const {
  messages,
  status,
  error,
  currentAssistantId,
  sendMessage,
  reconnect,
  stop,
  patchPendingUserMessage,
} = useChat(sessionId);

function syncBackendTitle() {
  $fetch(`/api/chats/spec?session_id=${sessionId}`)
    .then((chat: any) => {
      const backendName = chat?.name;
      if (backendName && backendName !== sessionName.value) {
        updateSession(sessionId, { name: backendName });
      }
    })
    .catch((err: any) => {
      console.error("[ChatPage] Failed to sync name:", err);
    });
}

const brandIcon = computed(
  () => getValue("appearance.brand.icon") || "i-lucide-sparkles",
);

const { updateApprovalStatus, getApprovalStatus, approvalStates } =
  useApprovalState();
const expandedReasoning = ref(new Set<string>());
const expandedToolCalls = ref(new Set<string>());
const manuallyCollapsed = ref(new Set<string>());
const autoExpandedBlock = ref<{
  id: string;
  type: "reasoning" | "toolCall";
} | null>(null);

function toggleReasoning(blockId: string) {
  if (expandedReasoning.value.has(blockId)) {
    expandedReasoning.value.delete(blockId);
    manuallyCollapsed.value.add(blockId);
  } else {
    expandedReasoning.value.add(blockId);
    manuallyCollapsed.value.delete(blockId);
  }
}

function toggleToolCall(callId: string) {
  if (expandedToolCalls.value.has(callId)) {
    expandedToolCalls.value.delete(callId);
    manuallyCollapsed.value.add(callId);
  } else {
    expandedToolCalls.value.add(callId);
    manuallyCollapsed.value.delete(callId);
  }
}

function getBlockId(block: MessageBlock): string | null {
  if (block.type === "reasoning") return block.id;
  if (block.type === "toolCall" && block.toolCall) return block.toolCall.id;
  return null;
}

// Track the active streaming block to detect new blocks
const streamingBlockKey = computed(() => {
  if (status.value !== "streaming") return null;
  const msg = messages.value.find(
    (m) => m.id === currentAssistantId.value && m.role === "assistant",
  );
  if (!msg) return null;
  return msg.blocks.length > 0
    ? `${msg.blocks.length}:${msg.blocks[msg.blocks.length - 1]!.id}`
    : "0";
});

// Auto-expand/collapse based on settings during streaming
watch(streamingBlockKey, (newKey, oldKey) => {
  if (status.value !== "streaming" || !newKey || newKey === oldKey) return;

  const msg = messages.value.find(
    (m) => m.id === currentAssistantId.value && m.role === "assistant",
  );
  if (!msg || msg.blocks.length === 0) return;

  const currentBlock = msg.blocks[msg.blocks.length - 1]!;
  const autoEC = getValue("general.behavior.autoExpandCollapse");

  if (autoEC) {
    // Auto-collapse the previously auto-expanded block (it's no longer streaming)
    if (
      autoExpandedBlock.value &&
      autoExpandedBlock.value.id !== getBlockId(currentBlock)
    ) {
      if (autoExpandedBlock.value.type === "reasoning") {
        expandedReasoning.value.delete(autoExpandedBlock.value.id);
      } else {
        expandedToolCalls.value.delete(autoExpandedBlock.value.id);
      }
      autoExpandedBlock.value = null;
    }

    // Auto-expand current block if not manually collapsed
    const blockId = getBlockId(currentBlock);
    if (blockId && !manuallyCollapsed.value.has(blockId)) {
      if (currentBlock.type === "reasoning") {
        expandedReasoning.value.add(currentBlock.id);
        autoExpandedBlock.value = { id: currentBlock.id, type: "reasoning" };
      }
      if (currentBlock.type === "toolCall" && currentBlock.toolCall) {
        expandedToolCalls.value.add(currentBlock.toolCall.id);
        autoExpandedBlock.value = {
          id: currentBlock.toolCall.id,
          type: "toolCall",
        };
      }
    }
  } else {
    // Individual settings
    if (
      currentBlock.type === "reasoning" &&
      getValue("general.behavior.expandReasoning") &&
      !manuallyCollapsed.value.has(currentBlock.id)
    ) {
      expandedReasoning.value.add(currentBlock.id);
    }
    if (
      currentBlock.type === "toolCall" &&
      currentBlock.toolCall &&
      getValue("general.behavior.expandTools") &&
      !manuallyCollapsed.value.has(currentBlock.toolCall.id)
    ) {
      expandedToolCalls.value.add(currentBlock.toolCall.id);
    }
  }
});

// Auto-collapse the auto-expanded block when streaming ends
watch(status, (newVal, oldVal) => {
  if (oldVal === "streaming" && newVal === "ready") {
    if (
      getValue("general.behavior.autoExpandCollapse") &&
      autoExpandedBlock.value
    ) {
      if (autoExpandedBlock.value.type === "reasoning") {
        expandedReasoning.value.delete(autoExpandedBlock.value.id);
      } else {
        expandedToolCalls.value.delete(autoExpandedBlock.value.id);
      }
      autoExpandedBlock.value = null;
    }
    manuallyCollapsed.value.clear();
  }
});

// 监听共享状态变化，同步到本地审批块
watch(
  approvalStates,
  () => {
    messages.value.forEach((msg) => {
      msg.blocks?.forEach((block) => {
        if (block.type === "approval" && block.approval?.requestId) {
          const sharedStatus = getApprovalStatus(block.approval.requestId);
          if (sharedStatus && sharedStatus !== block.approval.status) {
            block.approval.status = sharedStatus;
          }
        }
      });
    });
  },
  { deep: true },
);

function formatToolArgs(args: any): string {
  if (!args) return "{}";
  if (typeof args === "string") return args || "{}";
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function formatToolResult(result: any): string {
  if (!result) return "";
  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => p.text || JSON.stringify(p)).join("\n");
      }
      return result;
    } catch {
      return result;
    }
  }
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function isStreamingMessage(msg: ChatMessage): boolean {
  return (
    status.value === "streaming" &&
    msg.role === "assistant" &&
    msg.id === currentAssistantId.value
  );
}

function isStreamingBlock(msg: ChatMessage, block: MessageBlock): boolean {
  if (!isStreamingMessage(msg)) return false;
  const lastBlock = msg.blocks[msg.blocks.length - 1];
  return lastBlock?.id === block.id;
}

function applyDefaultExpandSettings() {
  const autoEC = getValue("general.behavior.autoExpandCollapse");
  if (autoEC) return; // autoExpandCollapse 不影响历史消息

  const expandReasoning = getValue("general.behavior.expandReasoning");
  const expandTools = getValue("general.behavior.expandTools");

  for (const msg of messages.value) {
    for (const block of msg.blocks) {
      if (block.type === "reasoning" && expandReasoning) {
        expandedReasoning.value.add(block.id);
      }
      if (block.type === "toolCall" && block.toolCall && expandTools) {
        expandedToolCalls.value.add(block.toolCall.id);
      }
    }
  }
}

function handleSubmit(text: string) {
  const readyAttachments = getReadyAttachments();
  if (readyAttachments.length > 0) {
    sendMessage(
      { text, attachments: readyAttachments },
      { onComplete: syncBackendTitle }
    );
    clearAll();
  } else {
    sendMessage(text, { onComplete: syncBackendTitle });
  }
}

const approvalLoadingIds = ref(new Set<string>());

function copyMessageText(message: any) {
  const text = message.parts?.[0]?.text || message.content || "";
  if (text) {
    navigator.clipboard.writeText(text).then(
      () => {
        useToast().add({
          title: t("common.copied"),
          color: "success",
        });
      },
      () => {
        useToast().add({
          title: t("common.copyFailed"),
          color: "error",
        });
      },
    );
  }
}

async function handleApproval(
  _msg: ChatMessage,
  block: MessageBlock,
  action: "approve" | "deny",
) {
  if (
    !block.approval?.requestId ||
    approvalLoadingIds.value.has(block.approval.requestId)
  )
    return;

  approvalLoadingIds.value.add(block.approval.requestId);
  try {
    await $fetch(`/api/approval/${action}`, {
      method: "POST",
      body: {
        request_id: block.approval.requestId,
        session_id: sessionId,
      },
    });
    // 更新本地状态
    block.approval.status = action === "approve" ? "approved" : "denied";
    // 更新共享状态
    updateApprovalStatus(block.approval.requestId, block.approval.status);
  } catch (err) {
    console.error("[ChatPage] Approval failed:", err);
  } finally {
    approvalLoadingIds.value.delete(block.approval!.requestId);
  }
}

const chatMessages = computed(
  () =>
    messages.value.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: [{ type: "text", text: msg.content }],
      blocks: msg.blocks,
    })) as any[],
);

const chatStatus = computed(() => {
  if (status.value === "streaming") return "streaming";
  if (status.value === "error") return "error";
  return "ready";
});
</script>

<template>
  <UDashboardPanel
    v-if="sessionData?.id"
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overflow-hidden' }"
  >
    <template #header>
      <Navbar :session="{ id: sessionId, name: sessionName }">
        <template #title>
          <span
            class="text-sm font-medium text-highlighted truncate min-w-0 max-w-3xs"
          >
            {{ sessionName }}
          </span>
        </template>
      </Navbar>
    </template>

    <template #body>
      <div class="flex-1 flex flex-col min-h-0">
        <div
          v-if="messages.length === 0 && status === 'ready'"
          class="flex items-center justify-center h-full text-muted text-sm px-4"
        >
          {{ t("chat.emptyState") }}
        </div>

        <UChatMessages
          :messages="chatMessages"
          :status="chatStatus"
          :should-scroll-to-bottom="true"
          :should-auto-scroll="true"
          class="flex-1 min-h-0 overflow-y-auto"
          :ui="{ root: 'pt-[calc(var(--ui-header-height)+1px)] px-4 sm:px-8' }"
          :user="{
            variant: getValue('appearance.theme.userVariant') || 'soft',
            ui: { content: 'max-w-[90%] text-sm', actions: 'cursor-pointer' },
            actions: [
              {
                icon: 'i-lucide-copy',
                variant: 'ghost',
                size: 'xs',
                onClick: (_e, msg) => copyMessageText(msg as any),
              },
            ],
          }"
          :assistant="{
            variant: getValue('appearance.theme.assistantVariant') || 'soft',
            ui: { content: 'max-w-[90%] text-sm', actions: 'cursor-pointer' },
            actions: [
              {
                icon: 'i-lucide-copy',
                variant: 'ghost',
                size: 'xs',
                onClick: (_e, msg) => copyMessageText(msg),
              },
            ],
          }"
        >
          <template #leading="{ message }">
            <div class="rounded-full ring-1 ring-default overflow-hidden p-0.5">
              <UIcon
                v-if="message.role === 'user'"
                name="i-lucide-user"
                class="h-8 w-8 text-muted"
              />
              <BrandIcon
                v-else
                :icon="brandIcon"
                class="h-8 w-8"
              />
            </div>
          </template>

          <template #content="{ message }">
            <div
              v-if="message.role === 'user'"
              class="text-sm leading-relaxed"
            >
              <!-- 用户消息中的附件 -->
              <template
                v-for="block in (message as any).blocks?.filter((b: any) => b.type === 'attachment')"
                :key="block.id"
              >
                <AttachmentPreview
                  :message-attachment="{
                    type: block.attachment?.type,
                    url: block.attachment?.url || '',
                    name: block.attachment?.name || ''
                  }"
                  class="inline-block mr-2 mb-2"
                />
              </template>
              <ChatMarkdownRenderer
                :markdown="(message as any).parts[0]?.text || ''"
                :streaming="false"
                class="prose dark:prose-invert prose-sm max-w-none"
              />
            </div>

            <template v-else>
              <template v-if="(message as any).blocks?.length">
                <template
                  v-for="block in (message as any).blocks"
                  :key="block.id"
                >
                  <!-- Reasoning block -->
                  <div
                    v-if="block.type === 'reasoning'"
                    class="mb-2 text-xs text-muted"
                  >
                    <div class="bg-muted/50 rounded overflow-hidden">
                      <div
                        class="flex items-center gap-2 px-2 py-1 cursor-pointer select-none hover:bg-muted/80 transition-colors"
                        @click="toggleReasoning(block.id)"
                      >
                        <UIcon
                          name="i-lucide-brain"
                          class="size-3 text-primary"
                        />
                        <span
                          v-if="
                            isStreamingMessage(message as any) &&
                              isStreamingBlock(message as any, block) &&
                              !block.text
                          "
                          class="animate-pulse"
                        >{{ t("chat.thinking") }}</span>
                        <span v-else>{{ t("chat.thinkingProcess") }}</span>
                        <UIcon
                          :name="
                            expandedReasoning.has(block.id)
                              ? 'i-lucide-chevron-down'
                              : 'i-lucide-chevron-right'
                          "
                          class="size-3 ml-auto"
                        />
                      </div>
                      <div
                        v-if="expandedReasoning.has(block.id) && block.text"
                        class="px-2 pb-2 border-t border-muted"
                      >
                        <div
                          class="mt-1 whitespace-pre-wrap italic text-[11px] leading-relaxed"
                        >
                          {{ block.text }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Text block -->
                  <ChatMarkdownRenderer
                    v-else-if="block.type === 'text' && block.text"
                    :markdown="block.text"
                    :streaming="
                      isStreamingMessage(message as any) &&
                        isStreamingBlock(message as any, block)
                    "
                    class="prose dark:prose-invert prose-sm max-w-none"
                  />

                  <!-- Tool call block -->
                  <div
                    v-else-if="block.type === 'toolCall' && block.toolCall"
                    class="mb-2 space-y-1"
                  >
                    <div class="text-xs bg-muted/50 rounded overflow-hidden">
                      <div
                        class="flex items-center gap-2 px-2 py-1 cursor-pointer select-none hover:bg-muted/80 transition-colors"
                        @click="toggleToolCall(block.toolCall!.id)"
                      >
                        <UIcon
                          name="i-lucide-wrench"
                          class="size-3 text-primary"
                        />
                        <span class="font-mono">{{
                          block.toolCall!.name || "..."
                        }}</span>
                        <span
                          v-if="block.toolCall!.result"
                          class="text-success"
                        >✓</span>
                        <span
                          v-else-if="block.toolCall!.name"
                          class="text-muted animate-pulse"
                        >...</span>
                        <UIcon
                          :name="
                            expandedToolCalls.has(block.toolCall!.id)
                              ? 'i-lucide-chevron-down'
                              : 'i-lucide-chevron-right'
                          "
                          class="size-3 ml-auto"
                        />
                      </div>
                      <div
                        v-if="expandedToolCalls.has(block.toolCall!.id)"
                        class="px-2 pb-2 border-t border-muted"
                      >
                        <div
                          v-if="block.toolCall!.args !== undefined"
                          class="mt-1"
                        >
                          <div class="text-muted font-medium mb-0.5">
                            {{ t("chat.parameters") }}
                          </div>
                          <pre
                            class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5"
                          >{{ formatToolArgs(block.toolCall!.args) }}</pre>
                        </div>
                        <div
                          v-if="block.toolCall!.result !== undefined"
                          class="mt-1"
                        >
                          <div class="text-muted font-medium mb-0.5">
                            {{ t("chat.result") }}
                          </div>
                          <pre
                            class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5"
                          >{{ formatToolResult(block.toolCall!.result) }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Stopped block -->
                  <div
                    v-else-if="block.type === 'stopped' && block.stopped"
                    class="mb-2 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 rounded-lg overflow-hidden"
                  >
                    <div
                      class="px-3 py-2 flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300"
                    >
                      <UIcon
                        name="i-lucide-square"
                        class="size-3"
                      />
                      <span>{{ t("chat.generationStopped") }}</span>
                    </div>
                    <div
                      v-if="block.stopped.message"
                      class="px-3 pb-2 text-xs text-amber-600 dark:text-amber-400"
                    >
                      {{ block.stopped.message }}
                    </div>
                  </div>

                  <!-- Approval block -->
                  <div
                    v-else-if="block.type === 'approval' && block.approval"
                    class="mb-2 border rounded-lg overflow-hidden"
                    :class="
                      block.approval.severity === 'HIGH'
                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
                    "
                  >
                    <div
                      class="px-3 py-2 flex items-center gap-2 text-xs font-medium"
                    >
                      <span>🛡️</span>
                      <span v-if="block.approval.status === 'pending'">{{
                        t("chat.waitingApproval")
                      }}</span>
                      <span v-else-if="block.approval.status === 'approved'">✅ {{ t("chat.approved") }}</span>
                      <span v-else>❌ {{ t("chat.denied") }}</span>
                      <span
                        v-if="block.approval.severity"
                        class="ml-auto px-1.5 py-0.5 rounded text-[10px]"
                        :class="
                          block.approval.severity === 'HIGH'
                            ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200'
                            : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
                        "
                      >
                        {{ block.approval.severity }}
                      </span>
                    </div>
                    <div class="px-3 pb-2 text-xs space-y-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-muted">{{ t("chat.tool") }}:</span>
                        <span class="font-mono">{{
                          block.approval.toolName
                        }}</span>
                      </div>
                      <div
                        v-if="block.approval.findingsSummary"
                        class="text-muted"
                      >
                        {{ block.approval.findingsSummary }}
                      </div>
                      <div
                        v-if="block.approval.toolParams"
                        class="mt-1"
                      >
                        <div class="text-muted font-medium mb-0.5">
                          {{ t("chat.parameters") }}
                        </div>
                        <pre
                          class="whitespace-pre-wrap break-all text-[11px] leading-relaxed bg-background/50 rounded p-1.5"
                        >{{ formatToolArgs(block.approval.toolParams) }}</pre>
                      </div>
                    </div>
                    <div
                      v-if="block.approval.status === 'pending'"
                      class="px-3 pb-2 flex gap-2"
                    >
                      <UButton
                        size="xs"
                        color="success"
                        variant="soft"
                        :loading="
                          approvalLoadingIds.has(block.approval!.requestId)
                        "
                        :disabled="
                          approvalLoadingIds.has(block.approval!.requestId)
                        "
                        @click="
                          handleApproval(message as any, block, 'approve')
                        "
                      >
                        {{ t("chat.approve") }}
                      </UButton>
                      <UButton
                        size="xs"
                        color="error"
                        variant="soft"
                        :loading="
                          approvalLoadingIds.has(block.approval!.requestId)
                        "
                        :disabled="
                          approvalLoadingIds.has(block.approval!.requestId)
                        "
                        @click="handleApproval(message as any, block, 'deny')"
                      >
                        {{ t("chat.deny") }}
                      </UButton>
                    </div>
                  </div>
                </template>
              </template>

              <!-- Streaming with no blocks yet -->
              <template v-else-if="isStreamingMessage(message as any)">
                <div
                  class="mb-2 text-xs text-muted border-l-2 border-primary/30 pl-2"
                >
                  <div class="flex items-center gap-1">
                    <UIcon
                      name="i-lucide-brain"
                      class="size-3"
                    />
                    <span class="animate-pulse">{{ t("chat.thinking") }}</span>
                  </div>
                </div>
              </template>
            </template>
          </template>
        </UChatMessages>

        <!-- 底部输入栏 -->
        <div class="border-t border-default bg-default/75 backdrop-blur p-4">
          <div
            v-if="error"
            class="mb-2 text-xs text-error"
          >
            {{ error.message }}
          </div>
          <ChatInput
            :session-id="sessionId"
            :business-key="businessKey"
            :status="status"
            :placeholder="t('chat.inputPlaceholder')"
            :ui="{ base: 'px-1.5', footer: 'justify-end' }"
            :attachments="attachments"
            :is-uploading="isUploading"
            :max-files="Number(getValue('advanced.upload.maxFiles')) || 5"
            @submit="handleSubmit"
            @stop="stop"
            @add-files="addFiles"
            @remove-file="removeFile"
            @retry-file="retryFile"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UContainer
    v-else-if="!loading"
    class="flex-1 flex flex-col gap-4 sm:gap-6"
  >
    <UError
      :error="{ statusMessage: t('chat.sessionNotFound'), statusCode: 404 }"
      class="min-h-full"
    >
      <template #links>
        <UButton
          to="/"
          size="lg"
          :label="t('chat.backToHome')"
        />
      </template>
    </UError>
  </UContainer>

  <UContainer
    v-else
    class="flex-1 flex flex-col items-center justify-center"
  >
    <UIcon
      name="i-lucide-loader-circle"
      class="animate-spin size-8 text-primary"
    />
    <p class="mt-2 text-muted">
      {{ t("common.loading") }}
    </p>
  </UContainer>
</template>
