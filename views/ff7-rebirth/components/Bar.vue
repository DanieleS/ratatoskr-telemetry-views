<script setup lang="ts">
/**
 * One gauge: a track and a fill. `value` is 0–1; null draws an empty track with no fill at all,
 * because an unreadable gauge must not look like an empty one.
 */
defineProps<{ value: number | null; color: string; height?: string }>();
</script>

<template>
  <div class="track" :style="{ height: height ?? '0.4rem' }" :data-unknown="value === null || undefined">
    <div v-if="value !== null" class="fill" :style="{ width: `${value * 100}%`, background: color }" />
  </div>
</template>

<style scoped>
.track {
  position: relative;
  background: var(--track);
  overflow: hidden;
}

.track[data-unknown] {
  background: repeating-linear-gradient(90deg, var(--track) 0 0.3rem, transparent 0.3rem 0.6rem);
}

.fill {
  height: 100%;
  transition: width 240ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .fill {
    transition: none;
  }
}
</style>
