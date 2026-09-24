<script setup lang="ts">
/**
 * A character's emblem, standing in for their portrait.
 *
 * The game's portraits are its own artwork and none of it ships in this file, so each character gets
 * a drawn mark instead: a sun for Zale, a moon for Valere, a cook's pot for Garl. It reads as the
 * character without pretending to be the sprite.
 */
import type { Sigil } from '../domain/characters';

defineProps<{ sigil: Sigil; accent: string; size?: string }>();
</script>

<template>
  <svg class="sigil" viewBox="0 0 24 24" :style="{ color: accent, width: size ?? '2.4rem', height: size ?? '2.4rem' }"
    aria-hidden="true">
    <!-- sun: Zale -->
    <g v-if="sigil === 'sun'" fill="currentColor">
      <circle cx="12" cy="12" r="5" />
      <g v-for="ray in 8" :key="ray" :transform="`rotate(${ray * 45} 12 12)`">
        <rect x="11" y="1" width="2" height="3.5" />
      </g>
    </g>

    <!-- moon: Valere -->
    <path v-else-if="sigil === 'moon'" fill="currentColor"
      d="M15 3a9 9 0 1 0 6 15 10 10 0 0 1-6-15z" />

    <!-- cooking pot: Garl -->
    <g v-else-if="sigil === 'pot'" fill="currentColor">
      <rect x="4" y="10" width="16" height="9" rx="1" />
      <rect x="2" y="8" width="20" height="2" />
      <rect x="11" y="4" width="2" height="3" />
      <rect x="8" y="5" width="2" height="2" opacity="0.6" />
      <rect x="14" y="5" width="2" height="2" opacity="0.6" />
    </g>

    <!-- dagger: Serai -->
    <g v-else-if="sigil === 'blade'" fill="currentColor">
      <path d="M12 2l3 8-3 3-3-3z" />
      <rect x="7" y="13" width="10" height="2" />
      <rect x="11" y="15" width="2" height="6" />
    </g>

    <!-- wind: Reshan -->
    <g v-else-if="sigil === 'wind'" fill="currentColor">
      <path d="M3 8h12a3 3 0 1 0-3-3" opacity="0.9" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M4 13h14a3 3 0 1 1-3 3" fill="none" stroke="currentColor" stroke-width="2" />
      <path d="M6 18h7" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6" />
    </g>

    <!-- gear: the Artificer -->
    <g v-else-if="sigil === 'gear'" fill="currentColor">
      <g v-for="tooth in 6" :key="tooth" :transform="`rotate(${tooth * 60} 12 12)`">
        <rect x="10.5" y="1.5" width="3" height="4" />
      </g>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2.2" fill="#0a1526" />
    </g>

    <!-- stone: Master Moraine -->
    <g v-else-if="sigil === 'stone'" fill="currentColor">
      <path d="M12 3l7 5-2 10H7L5 8z" />
      <path d="M12 3v15" stroke="#0a1526" stroke-width="1" opacity="0.5" />
    </g>

    <!-- reactor core: Prototype Zero -->
    <g v-else-if="sigil === 'core'" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </g>

    <!-- star: B'st, and anyone this file has never met -->
    <path v-else fill="currentColor" d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z" />
  </svg>
</template>

<style scoped>
.sigil {
  display: block;
  filter: drop-shadow(0 0 0.35rem color-mix(in srgb, currentColor 45%, transparent));
}
</style>
