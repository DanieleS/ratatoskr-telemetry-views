<script setup lang="ts">
/**
 * Out of combat: the party, their gear, their bag.
 *
 * The three pages are reached by tapping. That is allowed here and nowhere else in the panel: the
 * presentation window is non-focusable, so the gamepad never reaches this page, but it is not
 * non-touchable, so a finger does.
 */
import { computed, ref, watch } from 'vue';
import Panel from './Panel.vue';
import MemberCard from './MemberCard.vue';
import CharacterSheet from './CharacterSheet.vue';
import ItemList from './ItemList.vue';
import Sigil from './Sigil.vue';
import { party, partyVitals, progress, world } from '../domain/game';

type Page = 'party' | 'gear' | 'bag';

const page = ref<Page>('party');
const chosen = ref(0);

// The party can change under us — someone leaves, someone joins — and an index into a shorter list
// would quietly point at nobody.
watch(
  () => party.value.length,
  (length) => {
    if (chosen.value >= length) chosen.value = 0;
  },
);

const member = computed(() => party.value[chosen.value] ?? party.value[0]);

const pages: Array<{ id: Page; title: string }> = [
  { id: 'party', title: 'Party' },
  { id: 'gear', title: 'Equipment' },
  { id: 'bag', title: 'Items' },
];
</script>

<template>
  <div class="voyage">
    <nav class="tabs">
      <button v-for="tab in pages" :key="tab.id" class="tab" :class="{ selected: page === tab.id }"
        type="button" @click="page = tab.id">
        <span v-if="page === tab.id" class="marker">◆</span>{{ tab.title }}
      </button>
    </nav>

    <Panel class="body">
      <div v-if="page === 'party'" class="party">
        <MemberCard v-for="one in party" :key="one.id" :member="one" />
      </div>

      <template v-else-if="page === 'gear'">
        <div class="picker">
          <button v-for="(one, at) in party" :key="one.id" class="pick" :class="{ selected: at === chosen }"
            type="button" @click="chosen = at">
            <Sigil :sigil="one.sigil" :accent="one.accent" size="1.3rem" />
            <span>{{ one.name }}</span>
          </button>
        </div>
        <div class="rule" />
        <div class="sheet-hold">
          <CharacterSheet v-if="member" :member="member" />
        </div>
      </template>

      <ItemList v-else />
    </Panel>

    <Panel tight class="footer">
      <div class="cell">
        <span class="label">Location</span>
        <span class="value">{{ world.location || '—' }}</span>
      </div>
      <div class="cell">
        <span class="label">Level</span>
        <span class="value name">{{ progress.level ?? '—' }}</span>
      </div>
      <div class="cell">
        <span class="label">Total XP</span>
        <span class="value">{{ progress.totalXp ?? '—' }}</span>
      </div>
      <div class="cell">
        <span class="label">Party HP</span>
        <span class="value">
          {{ partyVitals.hp }}<span v-if="partyVitals.max" class="dim">/{{ partyVitals.max }}</span>
        </span>
      </div>
      <!-- Deliberately not `roster_hp_total`, which sums all nine characters in the collection and so
           reads four times the party's own total. This cell says what it says. -->
      <div class="cell">
        <span class="label">Roster</span>
        <span class="value">{{ partyVitals.size }}<span class="dim">/{{ progress.rosterSize }}</span></span>
      </div>
    </Panel>
  </div>
</template>

<style scoped>
.voyage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.tabs {
  display: flex;
  gap: 0.4rem;
  flex: 0 0 auto;
}

.tab {
  flex: 1;
  appearance: none;
  border: 0.0625rem solid var(--edge-shadow);
  background: linear-gradient(to bottom, #1b3760, #122543);
  color: var(--ink-dim);
  font: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  /* Comfortably tappable at any panel size, without growing with the font. */
  padding: 0.4rem 0.3rem;
  cursor: pointer;
}

.tab.selected {
  color: var(--ink);
}

.marker {
  color: var(--gold);
  font-size: 0.6rem;
  margin-right: 0.35rem;
  vertical-align: 0.1em;
}

.body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.party {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  flex: 1;
  min-height: 0;
}

/* The sheet is short and the panel is tall; centring it beats leaving it pinned to the top with a
   third of the panel empty under it. */
.sheet-hold {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
}

.sheet-hold > * {
  flex: 1;
  min-width: 0;
}

.picker {
  display: flex;
  gap: 0.4rem;
}

.pick {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  appearance: none;
  border: 0.0625rem solid var(--edge-shadow);
  background: transparent;
  color: var(--ink-dim);
  font: inherit;
  font-size: 0.75rem;
  padding: 0.25rem;
  cursor: pointer;
}

.pick.selected {
  color: var(--ink);
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.cell .label {
  font-size: 0.58rem;
}

.cell .value {
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
