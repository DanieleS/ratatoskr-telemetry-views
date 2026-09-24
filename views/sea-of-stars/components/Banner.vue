<script setup lang="ts">
/**
 * The line across the top, the way the game's menus have it: one sentence about right now, and a
 * counter to its right.
 *
 * The counter wants to be gold. The contract has no gold watch, so it shows unspent XP — same slot,
 * same shape. It used to switch to `gold` on its own the day that watch appeared; now a watch the
 * contract does not declare does not compile, so gold arrives the honest way: a minor adds it, this
 * view raises its range to that minor and reads it here. The coin in the template is kept for that.
 */
import { computed } from 'vue';
import Panel from './Panel.vue';
import { headline, progress } from '../domain/game';
import { pulses } from '../stream';

interface Counter {
  kind: 'xp' | 'gold';
  value: number | null;
  suffix: string;
  pulse: number;
}

const counter = computed<Counter>(() => ({
  kind: 'xp',
  value: progress.value.unspentXp,
  suffix: 'XP',
  pulse: pulses.party_progress ?? 0,
}));
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
