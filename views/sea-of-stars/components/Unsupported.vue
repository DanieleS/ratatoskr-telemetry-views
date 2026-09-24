<script setup lang="ts">
/**
 * What the panel shows for a stream this view was not written for: another game's contract, a
 * major it predates, or a stream that does not say what it carries.
 *
 * Nothing is drawn from the values — the stream does not even keep them — because a view guessing at
 * a shape it does not know is how a panel ends up showing someone else's numbers with confidence.
 * The sentence says which contract arrived and which one this view reads, so whoever is looking can
 * tell a missing view from a broken one.
 */
import Panel from './Panel.vue';
import manifest from '../manifest.json';

defineProps<{ reason: string }>();
</script>

<template>
  <Panel class="unsupported">
    <h1>{{ manifest.title }}</h1>
    <p class="state">Unsupported contract</p>
    <p class="reason dim">{{ reason }}</p>
  </Panel>
</template>

<style scoped>
.unsupported {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  text-align: center;
}
h1 {
  margin: 0;
  font-size: 1.4rem;
  color: var(--ink-dim);
}
.state {
  margin: 0;
  color: var(--danger);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.85rem;
}
.reason {
  margin: 0;
  max-width: 28rem;
  font-size: 0.8rem;
}
</style>
