<script setup lang="ts">
/**
 * In battle: the locked-on enemy on top, the party below.
 *
 * The enemy is drawn the way the game draws it, a bar and a percentage, because a percentage is all
 * the game shows and all the contract has. Stagger is a row of segments, filling amber and turning
 * red once the gauge is full.
 *
 * Each party row reads left to right the way a turn does: who, how much HP, whether an action is
 * ready (the two ATB segments next to the number), and a hairline of Limit underneath.
 */
import { computed } from 'vue';
import Bar from './Bar.vue';
import SceneHeader from './SceneHeader.vue';
import { formatNumber, formatPercent, hpBand, party, target } from '../domain/game';

const HP_COLOR = { ok: 'var(--hp)', low: 'var(--hp-low)', danger: 'var(--hp-danger)', unknown: 'var(--hp)' };
const SEGMENTS = 10;

const stagger = computed(() => {
  const value = target.value?.stagger ?? null;
  const full = value !== null && value >= 1;
  return {
    value,
    full,
    color: full ? 'var(--staggered)' : 'var(--stagger)',
    // A segment is lit when the gauge has reached its right-hand end.
    lit: Array.from({ length: SEGMENTS }, (_, i) => value !== null && value >= (i + 1) / SEGMENTS - 1e-6),
  };
});
</script>

<template>
  <section class="battle">
    <SceneHeader label="Battaglia" accent="var(--limit)" />

    <div class="target">
      <div class="reading">
        <span class="caption">Bersaglio</span>
        <span class="figures pct">{{ formatPercent(target?.hp ?? null) }}</span>
      </div>
      <span v-if="target?.name" class="enemy">{{ target.name }}</span>
      <Bar :value="target?.hp ?? null" color="#e7ecf2" height="0.65rem" />
      <div class="stagger">
        <div class="segments">
          <span
            v-for="(on, i) in stagger.lit"
            :key="i"
            class="segment"
            :style="{ background: on ? stagger.color : 'var(--track)' }"
          />
        </div>
        <span class="caption" :style="{ color: stagger.value === null ? undefined : stagger.color }">
          {{ stagger.full ? 'Stagger' : `Stagger ${formatPercent(stagger.value)}` }}
        </span>
      </div>
    </div>

    <ol class="party">
      <li v-for="member in party" :key="member.slot">
        <div class="who">
          <svg v-if="member.slot === 0" class="cursor" viewBox="0 0 8 10" aria-hidden="true">
            <path d="M1 1 L7 5 L1 9 Z" />
          </svg>
          <span class="name">{{ member.name }}</span>
        </div>

        <div class="gauges">
          <div class="reading">
            <span
              class="figures big"
              :style="{ color: hpBand(member.hpRatio) === 'danger' ? 'var(--hp-danger)' : undefined }"
            >
              {{ formatNumber(member.hp) }}
            </span>
            <div class="atb" :aria-label="`ATB di ${member.name}`">
              <span v-for="(fill, i) in member.atb" :key="i" class="cell">
                <span
                  v-if="fill !== null"
                  class="cell-fill"
                  :style="{
                    width: `${fill * 100}%`,
                    background: fill >= 1 ? 'var(--atb-full)' : 'var(--atb)',
                  }"
                />
              </span>
            </div>
          </div>
          <Bar :value="member.hpRatio" :color="HP_COLOR[hpBand(member.hpRatio)]" />
          <Bar :value="member.limit" color="var(--limit)" height="0.15rem" />
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.battle {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.target {
  margin-top: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.pct {
  font-size: 2rem;
  font-weight: 500;
}

.enemy {
  margin: -0.4rem 0 0.1rem;
  font-size: 2.1rem;
  font-weight: 500;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stagger {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.segments {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 0.25rem;
  padding: 0 0.2rem;
}

.segment,
.cell {
  height: 0.5rem;
  transform: skewX(-20deg);
  transition: background 200ms ease;
}

/* The party takes whatever height the target leaves, split evenly between its rows, so the panel
   has no dead band whatever its aspect or however many members are in the party. */
.party {
  flex: 1;
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 1.3rem 0 0;
  padding: 0;
  border-top: 1px solid var(--rule);
}

li {
  flex: 1;
  max-height: 7rem;
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr);
  column-gap: 1.6rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--rule);
}

.who {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cursor {
  width: 0.6rem;
  height: 0.75rem;
  fill: var(--atb-full);
}

.name {
  font-size: 1.65rem;
  font-weight: 500;
  white-space: nowrap;
}

.gauges {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.big {
  font-size: 2.1rem;
  font-weight: 500;
}

.atb {
  display: grid;
  grid-template-columns: repeat(2, 2.6rem);
  gap: 0.35rem;
  padding-right: 0.2rem;
}

.cell {
  height: 0.65rem;
  background: var(--track);
  overflow: hidden;
}

.cell-fill {
  display: block;
  height: 100%;
  transition: width 240ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .segment,
  .cell-fill {
    transition: none;
  }
}
</style>
