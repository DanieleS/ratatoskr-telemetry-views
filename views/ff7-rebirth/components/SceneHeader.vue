<script setup lang="ts">
/** The top line of the field and battle scenes: what is happening, whether the game is paused. */
import { paused } from '../domain/game';

defineProps<{ label: string; accent: string }>();
</script>

<template>
  <header>
    <span class="rule" :style="{ background: accent }" />
    <span class="caption" :style="{ color: accent }">{{ label }}</span>
    <span v-if="paused" class="paused caption">Pausa</span>
    <span class="end"><slot /></span>
  </header>
</template>

<style scoped>
header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.rule {
  width: 1.6rem;
  height: 1px;
}

.paused {
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--edge-lit);
  color: var(--ink-2);
}

.end {
  margin-left: auto;
}
</style>
