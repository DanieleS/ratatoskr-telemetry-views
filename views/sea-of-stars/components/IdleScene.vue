<script setup lang="ts">
/**
 * Nothing to show yet: no game attached, or a game sitting on its title screen with no party built.
 *
 * The footer is deliberately technical. This is the only screen with room for it, and it is exactly
 * the screen someone is looking at when they want to know whether the stream is alive at all — a
 * view cannot log anywhere else.
 */
import { computed } from 'vue';
import Panel from './Panel.vue';
import { meta } from '../stream';

const contract = computed(() =>
  meta.contract ? `${meta.contract.id} ${meta.contract.version}` : null,
);

const state = computed(() => {
  if (meta.gone) return 'The voyage ends here.';
  if (!meta.attached) return 'No game is attached.';
  return 'Awaiting the party.';
});
</script>

<template>
  <div class="idle">
    <Panel class="crest">
      <div class="mark" aria-hidden="true">
        <svg viewBox="0 0 64 40">
          <!-- The two solstice warriors, as their emblems: eclipse of sun and moon. -->
          <circle cx="26" cy="20" r="11" fill="var(--gold)" opacity="0.9" />
          <path d="M44 9a11 11 0 1 0 0 22 13 13 0 0 1 0-22z" fill="#a8d8f0" />
          <g fill="var(--gold)" opacity="0.7">
            <rect x="25" y="1" width="2" height="4" />
            <rect x="25" y="35" width="2" height="4" />
            <rect x="8" y="19" width="4" height="2" />
          </g>
        </svg>
      </div>

      <h1>Sea of Stars</h1>
      <p class="state">{{ state }}</p>
    </Panel>

    <Panel tight class="diag">
      <div class="cell"><span class="label">Process</span><span class="value">{{ meta.process ?? '—' }}</span></div>
      <div class="cell"><span class="label">Game</span><span class="value">{{ meta.slug ?? '—' }}</span></div>
      <div class="cell"><span class="label">Contract</span><span class="value">{{ contract ?? '—' }}</span></div>
      <div class="cell"><span class="label">Frames</span><span class="value">{{ meta.frames }}</span></div>
    </Panel>
  </div>
</template>

<style scoped>
.idle {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.crest {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.mark svg {
  width: 9rem;
  height: 5.6rem;
  /* Slow enough to read as a beacon rather than as something loading. */
  animation: breathe 6s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}

h1 {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--gold);
  letter-spacing: 0.04em;
}

.state {
  margin: 0;
  color: var(--ink-dim);
  font-size: 0.85rem;
}

.diag {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
}

.cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cell .label {
  font-size: 0.55rem;
}

.cell .value {
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
