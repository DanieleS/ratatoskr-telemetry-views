<script setup lang="ts">
/**
 * A pixel bar with its numbers.
 *
 * The flash is keyed on `pulse` — a counter the store bumps every time the host reports the watch
 * changed — and the element carrying the animation is `:key`ed to it. Remounting is what restarts a
 * CSS animation reliably, and it means the same value arriving twice still flashes twice: HP that
 * went 100 -> 90 -> 100 between two frames did something, even though the number ends up where it
 * started.
 */
import { computed } from 'vue';

const props = defineProps<{
  value: number | null;
  max: number | null;
  tone?: 'hp' | 'sp' | 'foe';
  pulse?: number;
  falling?: boolean;
  compact?: boolean;
}>();

const ratio = computed(() => {
  if (props.value == null || !props.max) return null;
  return Math.max(0, Math.min(1, props.value / props.max));
});

const fill = computed(() => {
  if (props.tone === 'sp') return 'var(--sp)';
  if (props.tone === 'foe') return 'var(--danger)';
  // HP shifts towards red as it empties, so a glance at the colour is enough.
  const at = ratio.value ?? 1;
  if (at <= 0.25) return 'var(--hp-low)';
  if (at <= 0.5) return 'color-mix(in srgb, var(--hp) 45%, var(--hp-low))';
  return 'var(--hp)';
});
</script>

<template>
  <div class="gauge" :class="{ 'gauge--compact': compact }">
    <div class="track">
      <div v-if="ratio !== null" class="fill" :style="{ width: `${ratio * 100}%`, background: fill }" />
      <!-- No max reported for this character: the profile derives one only for the three the game
           starts with. A bar with an invented maximum would be a lie, so there simply is none. -->
      <div v-else class="unknown" />
      <div class="notches" />
    </div>

    <div class="numbers">
      <span :key="pulse ?? 0" class="value" :class="{ falling, rising: pulse != null && !falling }">
        {{ value ?? '—' }}
      </span>
      <span v-if="max" class="dim">/{{ max }}</span>
    </div>
  </div>
</template>

<style scoped>
.gauge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  /* Grows inside whatever row it is dropped into. Without this the component root sizes to its
     content and the track — which is `flex: 1` of that — collapses to nothing. */
  flex: 1;
  min-width: 0;
}

.track {
  position: relative;
  flex: 1;
  height: 0.7rem;
  background: #0b1a2e;
  box-shadow: inset 0 0 0 0.0625rem rgba(166, 208, 242, 0.35);
  overflow: hidden;
}

.gauge--compact .track {
  height: 0.5rem;
}

.fill {
  height: 100%;
  /* Width, not transform: the bar has a hard pixel edge and a scaled one would blur it. */
  transition: width 260ms ease-out, background 400ms linear;
}

.unknown {
  height: 100%;
  opacity: 0.5;
  background: repeating-linear-gradient(
    135deg,
    rgba(143, 168, 203, 0.35) 0 0.25rem,
    transparent 0.25rem 0.5rem
  );
}

/* The vertical ticks that make it read as a game bar rather than a progress bar. */
.notches {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to right,
    transparent 0 0.55rem,
    rgba(8, 17, 32, 0.55) 0.55rem 0.625rem
  );
}

.numbers {
  min-width: 4.5rem;
  text-align: right;
  font-size: 0.85rem;
  white-space: nowrap;
}

.numbers .falling {
  animation: flash-damage 700ms ease-out;
}

.numbers .rising {
  animation: flash-gold 700ms ease-out;
}
</style>
