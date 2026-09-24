<script setup lang="ts">
/**
 * The equipment page, laid out the way the game lays it out: who on the left, what they carry in the
 * middle, what it adds up to on the right.
 */
import Sigil from './Sigil.vue';
import type { Member } from '../domain/game';
import { modifierKind, statLabel } from '../domain/stats';

defineProps<{ member: Member }>();
</script>

<template>
  <div class="sheet" :style="{ '--accent': member.accent }">
    <div class="who">
      <div class="portrait">
        <Sigil :sigil="member.sigil" :accent="member.accent" size="3.2rem" />
      </div>
      <div class="plate">{{ member.name }}</div>
      <p class="role label">{{ member.title }}</p>
    </div>

    <div class="gear">
      <p class="heading label">Equipment</p>

      <div v-if="member.equipment.length === 0" class="empty dim">Nothing equipped.</div>

      <div v-for="piece in member.equipment" :key="piece.slot + piece.label" class="row">
        <svg class="icon" viewBox="0 0 12 12" aria-hidden="true">
          <!-- weapon -->
          <g v-if="piece.icon === 'weapon'" fill="currentColor">
            <path d="M9 1l2 0 0 2-5 5-2-2z" />
            <rect x="2" y="8" width="3" height="1" />
            <rect x="3" y="9" width="1" height="2" />
          </g>
          <!-- armor -->
          <path v-else-if="piece.icon === 'armor'" fill="currentColor" d="M6 1l4 2v4l-4 4-4-4V3z" />
          <!-- trinket / group trinket -->
          <g v-else fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="6" cy="7" r="3.5" />
            <circle v-if="piece.icon === 'group'" cx="6" cy="2" r="1" fill="currentColor" stroke="none" />
          </g>
        </svg>

        <span class="what">{{ piece.label }}</span>
        <span class="adds dim">{{ piece.detail }}</span>
      </div>

      <template v-if="member.mods.length">
        <div class="rule" />
        <p class="heading label">Trinket effects</p>
        <div v-for="(mod, at) in member.mods" :key="at" class="mod">
          <span class="dim">{{ mod.source }}</span>
          <span class="value">
            {{ mod.amount >= 0 ? '+' : '' }}{{ mod.amount }} {{ statLabel(mod.stat) }}
          </span>
          <!-- Anything that is not a plain additive modifier is named, not interpreted: the profile
               reports the game's class name and we have never watched one of these fire. -->
          <span v-if="modifierKind(mod.kind) !== 'flat'" class="kind dim">{{ modifierKind(mod.kind) }}</span>
        </div>
      </template>
    </div>

    <div class="totals">
      <div class="total"><span class="label">HP</span><span class="value">{{ member.hp ?? '—' }}<span v-if="member.maxHp" class="dim">/{{ member.maxHp }}</span></span></div>
      <div class="total"><span class="label">SP</span><span class="value">{{ member.sp ?? '—' }}<span v-if="member.maxSp" class="dim">/{{ member.maxSp }}</span></span></div>
      <div class="rule" />
      <div class="total"><span class="label">ATK</span><span class="value">{{ member.atk ?? '—' }}</span></div>
      <div class="total"><span class="label">DEF</span><span class="value">{{ member.def ?? '—' }}</span></div>
      <div class="total"><span class="label">M.ATK</span><span class="value">{{ member.matk ?? '—' }}</span></div>
      <div class="total"><span class="label">M.DEF</span><span class="value">{{ member.mdef ?? '—' }}</span></div>
      <template v-if="member.upgrades.length">
        <div class="rule" />
        <p class="label">Upgrades</p>
        <div v-for="upgrade in member.upgrades" :key="upgrade.stat" class="total">
          <span class="label">{{ statLabel(upgrade.stat) }}</span>
          <span class="value">×{{ upgrade.count }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sheet {
  display: grid;
  grid-template-columns: 7.5rem 1fr 7rem;
  gap: 0.75rem;
  min-height: 0;
}

.who {
  text-align: center;
}

.portrait {
  display: grid;
  place-items: center;
  height: 5rem;
  background: linear-gradient(to bottom, #2a5079, #162c4e);
  box-shadow: inset 0 0 0 0.0625rem color-mix(in srgb, var(--accent) 60%, transparent);
}

.plate {
  margin-top: -0.55rem;
  display: inline-block;
  padding: 0 0.5rem;
  background: linear-gradient(to bottom, #24466f, #14294a);
  box-shadow: inset 0 0 0 0.0625rem var(--edge-shadow);
  color: var(--accent);
  font-size: 0.9rem;
}

.role {
  margin: 0.35rem 0 0;
  font-size: 0.6rem;
  line-height: 1.3;
}

.gear {
  min-width: 0;
}

.heading {
  margin: 0 0 0.35rem;
  text-align: center;
  /* The game's section headers sit in a flattened hexagon; a rule either side is the honest
     two-line version of it. */
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.heading::before,
.heading::after {
  content: '';
  flex: 1;
  height: 0.0625rem;
  background: var(--rule);
}

.row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.22rem 0.3rem;
  font-size: 0.9rem;
}

.icon {
  width: 0.85rem;
  height: 0.85rem;
  flex: 0 0 auto;
  color: var(--edge);
}

.what {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.adds {
  font-size: 0.7rem;
  white-space: nowrap;
}

.empty {
  font-size: 0.85rem;
  padding: 0.3rem;
}

.mod {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.78rem;
  padding: 0.1rem 0.3rem;
}

.mod .dim {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mod .kind {
  font-size: 0.65rem;
}

.totals {
  font-size: 0.85rem;
}

.total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.3rem;
}

.totals .label {
  font-size: 0.62rem;
}
</style>
