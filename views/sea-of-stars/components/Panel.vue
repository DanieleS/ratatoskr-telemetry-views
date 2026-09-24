<script setup lang="ts">
/**
 * A framed panel, with the small corner ornament the game puts on everything.
 *
 * The ornament is drawn rather than embedded: a view has no network, so every image would have to
 * become a data URI, and four corners of filigree are cheaper as fifteen lines of SVG.
 */
defineProps<{ tight?: boolean }>();
</script>

<template>
  <div class="panel" :class="{ 'panel--tight': tight }">
    <svg v-for="place in ['tl', 'tr', 'bl', 'br']" :key="place" class="corner" :class="`corner--${place}`"
      viewBox="0 0 8 8" aria-hidden="true">
      <path d="M0 3h1V1h2V0H0z" fill="currentColor" />
      <path d="M2 2h1v1H2z" fill="currentColor" opacity="0.7" />
    </svg>
    <slot />
  </div>
</template>
