<script setup lang="ts">
/**
 * Which of the three scenes the panel is showing, and the banner that sits above all of them.
 *
 * The scene is chosen by the game's own state, not by anything the viewer does — the panel takes
 * touches but never focus, so there is no navigation to be had beyond the tabs inside a scene.
 *
 * Above all of that sits the contract check: a stream this view was not written for gets a
 * refusal and nothing else, not a best effort over values of a shape it does not know.
 */
import Banner from './components/Banner.vue';
import IdleScene from './components/IdleScene.vue';
import VoyageScene from './components/VoyageScene.vue';
import BattleScene from './components/BattleScene.vue';
import Unsupported from './components/Unsupported.vue';
import { meta, scene } from './domain/game';
</script>

<template>
  <div class="view" :data-state="meta.unsupported ? 'unsupported' : scene">
    <div class="stars" />

    <div v-if="meta.unsupported" class="stage">
      <Unsupported :reason="meta.unsupported" />
    </div>

    <div v-else class="stage">
      <Banner />

      <!-- out-in, because both scenes are full-height: overlapping them would make the panel jump. -->
      <Transition name="scene" mode="out-in">
        <IdleScene v-if="scene === 'idle'" key="idle" />
        <BattleScene v-else-if="scene === 'battle'" key="battle" />
        <VoyageScene v-else key="voyage" />
      </Transition>
    </div>
  </div>
</template>

