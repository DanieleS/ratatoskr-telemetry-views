<script setup lang="ts">
/**
 * The line across the top, the way the game's menus have it: one sentence about right now, and a
 * counter to its right.
 *
 * The counter wants to be gold. The profile has no gold watch yet, so until one appears it shows
 * unspent XP — same slot, same shape, and the day `gold` starts arriving it switches over on its own.
 */
import { computed } from 'vue';
import Panel from './Panel.vue';
import { gold, headline, progress } from '../domain/game';
import { pulses } from '../scry/store';

const counter = computed(() => {
  if (gold.value != null) {
    return { kind: 'gold' as const, value: gold.value, suffix: 'G', pulse: pulses['gold'] ?? 0 };
  }
  return {
    kind: 'xp' as const,
    value: progress.value.unspentXp,
    suffix: 'XP',
    pulse: pulses['party_progress'] ?? 0,
  };
});
</script>

<template>
  <div class="banner">
    <Panel tight class="banner__text">
      <p class="line">{{ headline }}</p>
    </Panel>

    <Panel v-if="counter.value != null" tight class="banner__counter">
      <svg class="coin" viewBox="0 0 12 12" aria-hidden="true">
        <circle v-if="counter.kind === 'gold'" cx="6" cy="6" r="5" fill="var(--gold)" />
        <path v-else fill="var(--gold)" d="M6 0l1.5 4.5L12 6 7.5 7.5 6 12 4.5 7.5 0 6l4.5-1.5z" />
      </svg>
      <span :key="counter.pulse" class="value amount">{{ counter.value }}</span>
      <span class="suffix">{{ counter.suffix }}</span>
    </Panel>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  gap: 0.6rem;
  align-items: stretch;
  flex: 0 0 auto;
}

.banner__text {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.line {
  margin: 0;
  font-size: 1rem;
  /* One line, always: the banner is a fixed landmark and must not resize the scene under it. */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner__counter {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
}

.coin {
  width: 0.8rem;
  height: 0.8rem;
}

.amount {
  color: var(--gold);
  font-size: 1rem;
  animation: flash-gold 700ms ease-out;
}

.suffix {
  font-size: 0.7rem;
  color: var(--gold-dim);
}
</style>
