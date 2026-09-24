<script setup lang="ts">
/**
 * What the party is carrying, grouped the way a shop menu groups it.
 *
 * The stream reports held items as GUIDs and quantities, and separately a 439-entry catalogue that
 * says what each GUID is; the join happens in the domain layer. Scrolls by touch — the panel window
 * takes touches even though it never takes focus.
 */
import { inventory } from '../domain/game';
</script>

<template>
  <div class="items scroll">
    <div class="head">
      <span class="label">Item name</span>
      <span class="label">Owned</span>
    </div>

    <!-- The header stays out of the columns: it is one row for the whole list, not per column. -->
    <div class="groups">
      <div v-for="group in inventory" :key="group.kind" class="group">
        <p class="kind label">{{ group.title }}</p>
        <div v-for="item in group.items" :key="item.name" class="row">
          <span class="what">{{ item.name }}</span>
          <span class="qty value">{{ item.qty }}</span>
        </div>
      </div>
    </div>

    <p v-if="inventory.length === 0" class="empty dim">Nothing in the bag.</p>
  </div>
</template>

<style scoped>
.items {
  font-size: 0.9rem;
  padding-right: 0.3rem;
}

.head {
  display: flex;
  justify-content: space-between;
  position: sticky;
  top: 0;
  /* Opaque, not translucent: rows scrolling under a see-through header is noise on a small panel. */
  background: linear-gradient(to bottom, #1d3a66, #1a3560);
  padding: 0.15rem 0.3rem 0.25rem;
  border-bottom: 0.0625rem solid var(--rule);
  z-index: 1;
}

/* Item names are short and the panel is wide: one column of text down the middle of a landscape
   screen wastes most of it. Columns appear as the width allows, none of it hard-coded. */
.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  align-content: start;
  gap: 0 1.2rem;
}

.group {
  min-width: 0;
}

.kind {
  margin: 0.5rem 0 0.15rem;
  color: var(--gold-dim);
  font-size: 0.62rem;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.12rem 0.3rem;
}

.row:nth-child(odd) {
  background: rgba(8, 17, 32, 0.25);
}

.what {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.qty {
  color: var(--gold);
  flex: 0 0 auto;
}

.empty {
  padding: 0.5rem 0.3rem;
}
</style>
