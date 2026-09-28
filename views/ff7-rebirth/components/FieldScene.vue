<script setup lang="ts">
/**
 * Out of battle: the party at a glance, and the two numbers a player checks in the menu.
 *
 * Three rows, one per active member, and nothing else competing with them. MP stays here and not in
 * battle, where the game already shows it and ATB matters more.
 */
import Bar from './Bar.vue';
import SceneHeader from './SceneHeader.vue';
import { formatNumber, gil, hpBand, party, playTime } from '../domain/game';

const HP_COLOR = { ok: 'var(--hp)', low: 'var(--hp-low)', danger: 'var(--hp-danger)', unknown: 'var(--hp)' };
</script>

<template>
  <section class="field">
    <SceneHeader label="Esplorazione" accent="var(--atb-full)">
      <span v-if="playTime" class="figures time">{{ playTime }}</span>
    </SceneHeader>

    <ol class="party">
      <li v-for="member in party" :key="member.slot" :class="{ leader: member.slot === 0 }">
        <div class="who">
          <svg v-if="member.slot === 0" class="cursor" viewBox="0 0 8 10" aria-hidden="true">
            <path d="M1 1 L7 5 L1 9 Z" />
          </svg>
          <span class="name">{{ member.name }}</span>
          <span v-if="member.level !== null" class="level figures">Lv {{ member.level }}</span>
        </div>

        <div class="stat">
          <div class="reading">
            <span class="caption">PV</span>
            <span class="figures big">
              {{ formatNumber(member.hp) }}<span class="max"> / {{ formatNumber(member.hpMax) }}</span>
            </span>
          </div>
          <Bar :value="member.hpRatio" :color="HP_COLOR[hpBand(member.hpRatio)]" />
        </div>

        <div class="stat">
          <div class="reading">
            <span class="caption">PM</span>
            <span class="figures big">
              {{ formatNumber(member.mp) }}<span class="max"> / {{ formatNumber(member.mpMax) }}</span>
            </span>
          </div>
          <Bar :value="member.mpRatio" color="var(--mp)" />
        </div>
      </li>
    </ol>

    <footer>
      <span class="figures gil">{{ formatNumber(gil) }}</span>
      <span class="caption">Guil</span>
    </footer>
  </section>
</template>

<style scoped>
.field {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.time {
  font-size: 1.5rem;
  color: var(--ink-2);
}

/* As in battle: the rows share the height between the header and the gil line evenly. */
.party {
  flex: 1;
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 1.2rem 0 1.2rem;
  padding: 0;
  border-top: 1px solid var(--rule);
}

li {
  flex: 1;
  max-height: 8rem;
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr) minmax(0, 0.72fr);
  column-gap: 1.6rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--rule);
}

.who {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.cursor {
  width: 0.6rem;
  height: 0.75rem;
  fill: var(--atb-full);
  align-self: center;
}

.name {
  font-size: 1.65rem;
  font-weight: 500;
  white-space: nowrap;
}

.level {
  font-size: 1.05rem;
  color: var(--ink-3);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.reading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.big {
  font-size: 2rem;
  font-weight: 500;
}

.max {
  font-size: 1.05rem;
  color: var(--ink-3);
}

footer {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.gil {
  font-size: 1.7rem;
}
</style>
