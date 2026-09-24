<script setup lang="ts">
/**
 * One party member, at a glance: emblem, name plate, HP, SP and the four fighting numbers.
 */
import Sigil from './Sigil.vue';
import Gauge from './Gauge.vue';
import type { Member } from '../domain/game';

defineProps<{ member: Member }>();
</script>

<template>
  <div class="card" :style="{ '--accent': member.accent }">
    <div class="portrait">
      <Sigil :sigil="member.sigil" :accent="member.accent" size="2.1rem" />
      <span v-if="member.isLeader" class="leader" title="Leading the party">◆</span>
    </div>

    <div class="body">
      <div class="head">
        <span class="who">{{ member.name }}</span>
        <span v-if="member.boost > 0" class="boost">BOOST ×{{ member.boost }}</span>
        <span class="role dim">{{ member.title }}</span>
      </div>

      <!-- Bars and numbers side by side rather than stacked: the panel is landscape, and a health bar
           six hundred pixels long for sixty-six hit points was spending width to say nothing. -->
      <div class="vitals">
        <div class="bars">
          <div class="bar">
            <span class="label">HP</span>
            <Gauge :value="member.hp" :max="member.maxHp" tone="hp" :pulse="member.hpPulse"
              :falling="member.hpFalling" />
          </div>
          <div class="bar">
            <span class="label">SP</span>
            <Gauge :value="member.sp" :max="member.maxSp" tone="sp" compact />
          </div>
        </div>

        <div class="stats">
          <div class="stat"><span class="label">ATK</span><span class="value">{{ member.atk ?? '—' }}</span></div>
          <div class="stat"><span class="label">M.ATK</span><span class="value">{{ member.matk ?? '—' }}</span></div>
          <div class="stat"><span class="label">DEF</span><span class="value">{{ member.def ?? '—' }}</span></div>
          <div class="stat"><span class="label">M.DEF</span><span class="value">{{ member.mdef ?? '—' }}</span></div>
        </div>
      </div>

      <!-- What they are carrying, in one line. The full list is a tap away on the Equipment page;
           this is here so the card says something about the character beyond their numbers. -->
      <p v-if="member.equipment.length" class="carrying dim">
        {{ member.equipment.map((piece) => piece.label).join(' · ') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  gap: 0.65rem;
  padding: 0.5rem 0.15rem;
}

.card + .card {
  border-top: 0.0625rem solid var(--rule);
}

.portrait {
  position: relative;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  background: linear-gradient(to bottom, #24466f, #142a4c);
  box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--accent) 55%, transparent);
}

.leader {
  position: absolute;
  right: -0.2rem;
  top: -0.35rem;
  font-size: 0.7rem;
  color: var(--gold);
}

.body {
  flex: 1;
  min-width: 0;
}

.head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.who {
  color: var(--accent);
  font-size: 1rem;
  font-weight: 700;
}

.role {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.boost {
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: var(--gold);
  padding: 0 0.25rem;
  box-shadow: inset 0 0 0 0.0625rem var(--gold-dim);
}

/* Bars and the four numbers share a line where there is room, and the numbers drop underneath where
   there is not — a portrait panel gets the stacked version without a breakpoint deciding so. */
.vitals {
  margin-top: 0.3rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.bars {
  flex: 1 1 11rem;
  max-width: 26rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.bar .label {
  width: 1.6rem;
  flex: 0 0 auto;
}

.stats {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 0.1rem 1rem;
  padding-left: 1rem;
  border-left: 0.0625rem solid var(--rule);
}

.stat {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.carrying {
  margin: 0.35rem 0 0;
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
