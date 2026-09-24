<script setup lang="ts">
/**
 * In combat: what is trying to kill the party, and how the party is holding up.
 *
 * The panel switches here the instant `in_combat` goes up, and lingers a beat after it goes down —
 * the flag drops between phases of the same encounter, and a scene that tracked it exactly would
 * flicker (see `scene` in domain/game.ts).
 */
import Panel from './Panel.vue';
import Gauge from './Gauge.vue';
import Sigil from './Sigil.vue';
import { computed } from 'vue';
import { encounterXp, enemies, party, partyVitals, resources } from '../domain/game';
import { pulses } from '../stream';

/**
 * How many combo pips to draw. The count comes straight from `max_combo_points`, an i32 read out of
 * memory, and a `v-for` over a number renders that many elements: one garbage read mid-transition
 * (2147483647 is a perfectly valid i32) and the panel freezes building two billion spans. The game's
 * gauge holds a handful, so anything past a dozen is not a gauge worth drawing faithfully.
 */
const MAX_PIPS = 12;
const pips = computed(() => Math.max(0, Math.min(MAX_PIPS, Math.floor(resources.value.maxCombo))));
</script>

<template>
  <div class="battle">
    <Panel class="foes">
      <p class="heading label">
        Foes
        <span v-if="encounterXp != null" class="prize">{{ encounterXp }} XP</span>
      </p>

      <div class="foe-list scroll">
        <div v-for="(foe, at) in enemies" :key="`${foe.name}-${at}`" class="foe">
          <div class="foe__head">
            <span class="foe__name">{{ foe.name || 'Something' }}</span>
            <span v-if="foe.level != null" class="label">LV {{ foe.level }}</span>
          </div>
          <Gauge :value="foe.hp" :max="foe.maxHp" tone="foe" :pulse="pulses.enemies ?? 0"
            :falling="foe.falling" compact />
          <div class="foe__stats">
            <span><span class="label">ATK</span> {{ foe.atk ?? '—' }}</span>
            <span><span class="label">DEF</span> {{ foe.def ?? '—' }}</span>
            <span><span class="label">M.ATK</span> {{ foe.matk ?? '—' }}</span>
            <span><span class="label">M.DEF</span> {{ foe.mdef ?? '—' }}</span>
          </div>
        </div>

        <!-- `enemies` reads null outside a fight and for a beat at the start of one, so an empty list
             here is "not yet", not "no enemies". -->
        <p v-if="enemies.length === 0" class="empty dim">Sizing up the encounter…</p>
      </div>
    </Panel>

    <Panel class="party">
      <div v-for="one in party" :key="one.id" class="member" :style="{ '--accent': one.accent }">
        <Sigil :sigil="one.sigil" :accent="one.accent" size="1.5rem" />
        <span class="who">{{ one.name }}</span>
        <div class="gauges">
          <Gauge :value="one.hp" :max="one.maxHp" tone="hp" :pulse="one.hpPulse" :falling="one.hpFalling" />
          <Gauge :value="one.sp" :max="one.maxSp" tone="sp" compact />
        </div>
        <span v-if="one.boost > 0" class="boost">×{{ one.boost }}</span>
      </div>
    </Panel>

    <!-- Last in source order so that on a wide panel, where foes and party sit side by side, the
         strip runs along the bottom of both rather than splitting them. -->
    <Panel tight class="resources">
      <div class="combo">
        <span class="label">Combo</span>
        <span v-for="point in pips" :key="point" class="pip"
          :class="{ lit: point <= Math.floor(resources.combo) }">◆</span>
      </div>
      <div class="ult">
        <span class="label">Ult</span>
        <div class="ult__track">
          <div class="ult__fill" :style="{ width: `${Math.min(100, resources.ult)}%` }" />
        </div>
        <span class="value">{{ resources.ult }}</span>
      </div>
      <!-- Counted over the party, not over `roster_downed`: that watch would flag a character at zero
           HP who is not even in the fight. -->
      <div v-if="partyVitals.downed > 0" class="downed">{{ partyVitals.downed }} down</div>
    </Panel>
  </div>
</template>

<style scoped>
/*
 * Foes above, party below, resources along the bottom — the way a JRPG puts them, and the shape that
 * suits the panel this is for. Tried wrapping these into two columns on wide screens; with wrapped
 * flex lines sharing the height by default, the party panel inflated to a third of the panel to hold
 * three bars. Reflow happens *inside* the foe list and the item list instead, where it costs nothing.
 */
.battle {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.foes {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.heading {
  margin: 0 0 0.4rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.prize {
  color: var(--gold);
  font-size: 0.7rem;
}

/*
 * Foes pack into as many columns as fit rather than into one tall list. An encounter is two or three
 * monsters far more often than it is ten, and a single column left two thirds of the panel empty on a
 * landscape screen. auto-fill does this without a breakpoint: one column when there is room for one,
 * three when there is room for three.
 */
.foe-list {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  align-content: start;
  gap: 0.45rem;
}

.foe {
  padding: 0.3rem 0.35rem;
  background: rgba(8, 17, 32, 0.3);
  box-shadow: inset 0 0 0 0.0625rem rgba(239, 106, 82, 0.25);
}

.foe__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.foe__name {
  color: #ffc9bd;
  font-size: 0.9rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.foe__stats {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  margin-top: 0.15rem;
  font-size: 0.72rem;
}

.empty {
  font-size: 0.85rem;
}

.resources {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 0 0 auto;
}

.combo {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.pip {
  color: var(--edge-shadow);
  font-size: 0.85rem;
}

.pip.lit {
  color: var(--gold);
  text-shadow: 0 0 0.35rem rgba(245, 196, 81, 0.8);
}

.ult {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ult__track {
  flex: 1;
  height: 0.45rem;
  background: #0b1a2e;
  box-shadow: inset 0 0 0 0.0625rem rgba(199, 154, 245, 0.4);
}

.ult__fill {
  height: 100%;
  background: var(--ult);
  transition: width 260ms ease-out;
}

.ult .value {
  font-size: 0.8rem;
}

.downed {
  color: var(--danger);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.party {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.member {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  /* Name and bars sit on one line while there is width for both, and stack when there is not. */
  flex-wrap: wrap;
}

.member .who {
  width: 4.5rem;
  flex: 0 0 auto;
  color: var(--accent);
  font-size: 0.85rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.gauges {
  /* The basis is what makes the wrap above meaningful: below it, the bars claim their own line. The
     cap is because a bar has a job, and being nine hundred pixels long for sixty-six HP is not it. */
  flex: 1 1 12rem;
  max-width: 30rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.boost {
  color: var(--gold);
  font-size: 0.7rem;
}
</style>
