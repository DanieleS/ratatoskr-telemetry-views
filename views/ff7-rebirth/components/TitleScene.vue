<script setup lang="ts">
/**
 * Deliberately almost empty: the game is attached but not playing, and the panel should not
 * compete with a title screen for attention.
 *
 * One root element, and no comment beside it: the scene sits inside a `<Transition>`, which needs a
 * single element to animate out before the next scene comes in.
 */
</script>

<template>
  <div class="title">
    <div class="line">
      <span class="rule" />
      <span class="caption">Title screen</span>
    </div>
    <span class="hint">In attesa di un salvataggio</span>
  </div>
</template>

<style scoped>
.title {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.line {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.rule {
  width: 1.6rem;
  height: 1px;
  background: var(--edge-lit);
}

.caption {
  color: var(--ink-2);
}

.hint {
  padding-left: 2.4rem;
  font-size: 1.1rem;
  color: var(--ink-3);
}
</style>
