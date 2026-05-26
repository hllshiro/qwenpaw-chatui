<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UDashboardNavbar
    class="absolute top-0 inset-x-0 border-b-0 z-10 bg-default/80 backdrop-blur-lg lg:backdrop-blur-none pointer-events-none sm:px-4"
    :ui="{ left: 'pointer-events-auto min-w-0', right: 'pointer-events-auto' }"
  >
    <template #left>
      <slot name="title" />
    </template>

    <template #right>
      <slot />

      <UColorModeButton />

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
