<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useSessions } from "@/composables/useSessions";
import { useSettings } from "@/composables/settings";

const router = useRouter();
const { t } = useI18n();
const { createSession, businessKey } = useSessions();
const { getValue } = useSettings();

const brandName = computed(
  () => getValue("appearance.brand.name") || "QwenPaw",
);

const loading = ref(false);

async function onSubmit(text: string) {
  loading.value = true;
  try {
    const session = await createSession();
    router.push({ path: `/chat/${session.id}`, query: { msg: text } });
  } catch (err) {
    console.error("[Home] Error:", err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UDashboardPanel
    id="home"
    class="min-h-0"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <Navbar />
    </template>

    <template #body>
      <UContainer
        class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8"
      >
        <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
          {{ brandName }}
        </h1>

        <p class="text-muted">
          {{ t("chat.welcome") }}
        </p>

        <ChatInput
          :business-key="businessKey"
          :status="loading ? 'streaming' : 'ready'"
          class="[view-transition-name:chat-prompt]"
          :ui="{ base: 'px-1.5', footer: 'justify-end' }"
          @submit="onSubmit"
        />
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
