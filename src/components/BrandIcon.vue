<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  icon: string
}>()

const isImage = computed(() => props.icon && !props.icon.startsWith('i-'))
</script>

<template>
  <img
    v-if="isImage"
    :src="icon"
    class="shrink-0 rounded"
  >
  <UIcon
    v-else
    :name="icon"
    class="shrink-0 text-primary"
  />
</template>
