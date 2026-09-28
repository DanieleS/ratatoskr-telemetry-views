<script setup lang="ts">
defineProps<{ reason: string }>();
</script>

<template>
  <div class="unsupported">
    <span class="caption">Contratto non supportato</span>
    <p>{{ reason }}</p>
  </div>
</template>

<style scoped>
.unsupported {
  margin: auto 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

p {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.45;
  color: var(--ink-2);
}
</style>
