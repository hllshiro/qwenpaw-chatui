<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  session?: { id: string; name: string } | null
}>()

const { t } = useI18n()
</script>

<template>
  <UDashboardNavbar
    class="absolute top-0 inset-x-0 border-b-0 z-10 bg-default/95 backdrop-blur-lg lg:backdrop-blur-none pointer-events-none sm:px-4"
    :ui="{ left: 'pointer-events-auto min-w-0', right: 'pointer-events-auto' }"
  >
    <template #left>
      <slot name="title" />
    </template>

    <template #right>
      <slot />

      <SessionMenu :session="session ?? null">
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          size="sm"
          class="cursor-pointer"
          :aria-label="t('chat.sessionActions')"
        />
      </SessionMenu>

      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-circle-plus"
        to="/"
        class="lg:hidden"
        :aria-label="t('components.navbar.newSession')"
      />
    </template>
  </UDashboardNavbar>
</template>
