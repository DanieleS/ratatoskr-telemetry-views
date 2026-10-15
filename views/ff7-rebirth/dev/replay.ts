/**
 * The stand-in for Ratatoskr, so the view can be built in a browser.
 *
 * It drives the real bridge, `window.scry.onFrame`, with a real capture: `scry watch --once` taken
 * mid-battle, paused, with an enemy locked on. Everything after the first snapshot is invented,
 * because one tick cannot show a gauge filling.
 *
 * The capture is a 1.1 one, announced as 1.2: a minor only adds, so its values are a 1.2 picture
 * that lacks the newer watches, and the script supplies `battle_hud` itself.
 *
 * Excluded from the production build (see main.ts). A view has no business being able to make up
 * telemetry on a device.
 */
import capture from '../../../fixtures/ff7-rebirth/1.1/steam-battle.json?raw';
import manifest from '../manifest.json';
import type { Values } from '../stream';

interface Event {
  event?: string;
  values?: Partial<Values>;
  process?: string;
  profile?: string;
  contract?: { id: string; version: string };
}

/** `scry watch --format json` writes one JSON object per line. */
const events = capture
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line) as Event);

const attached = events.find((event) => event.event === 'attached');
const first = events.find((event) => event.event === 'values');
if (!first?.values) throw new Error('The capture has no "values" event to replay.');

const captured: Partial<Values> = structuredClone(first.values);
let live: Partial<Values> = structuredClone(captured);

function frame(kind: 'snapshot' | 'diff' | 'detached', body: unknown) {
  // Through the same door the app uses, quoted-and-parsed included, so the harness cannot
  // accidentally be gentler than the real thing.
  window.scry?.onFrame(kind, JSON.parse(JSON.stringify(body)));
}

function snapshot() {
  frame('snapshot', {
    attached: true,
    slug: 'Final Fantasy VII Rebirth',
    process: attached?.process ?? 'ff7rebirth_.exe',
    profile: attached?.profile ?? null,
    contract: { id: attached?.contract?.id ?? manifest.contract.id, version: '1.2' },
    values: live,
  });
}

function diff(patch: Partial<Values>) {
  live = { ...live, ...patch };
  frame('diff', patch);
}

// --- small edits of the live picture -----------------------------------------------------------

function hurt(character: number, amount: number) {
  const characters = structuredClone(live.characters ?? []);
  const one = characters[character];
  if (!one || one.hp == null) return;
  one.hp = Math.max(0, Math.min(one.hp_max ?? one.hp, one.hp - amount));
  diff({ characters });
}

function gauge(slot: number, patch: { atb?: number; limit?: number }) {
  const gauges = structuredClone(live.party_gauges ?? []);
  const one = gauges[slot];
  if (!one) return;
  if (patch.atb !== undefined) one.atb = Math.max(0, Math.min(3000, patch.atb));
  if (patch.limit !== undefined) one.limit = Math.max(0, Math.min(1, patch.limit));
  diff({ party_gauges: gauges });
}

/** Out of battle the game leaves the last enemy bar on screen, so the target's values stay as they were. */
const field = () => diff({ battle_hud: 1, game_pause: 0, game_state: 6 });
const battle = (hp = 100, stagger = 0) =>
  diff({ battle_hud: 0, target_hp_pct: hp, target_stagger_pct: stagger, game_pause: 0, game_state: 6 });
/** What the title screen really reports: level-1 records with a max HP of 0, and the clock running. */
const title = () =>
  diff({
    characters: (captured.characters ?? []).map((one) => (one ? { ...one, level: 1, hp_max: 0, mp_max: 0 } : one)),
    target_hp_pct: null,
    target_stagger_pct: null,
  });

// --- a short script, so every scene gets exercised without anyone touching a keyboard ------------

let timeline: number[] = [];

function at(ms: number, action: () => void) {
  timeline.push(window.setTimeout(action, ms));
}

function run() {
  timeline.forEach(clearTimeout);
  timeline = [];
  live = structuredClone(captured);
  title();
  snapshot();

  at(2500, () => {
    diff({ characters: captured.characters ?? [], party: captured.party ?? [], play_time_s: captured.play_time_s ?? 0 });
    field();
  });
  at(6000, () => {
    battle();
    [0, 1, 2].forEach((slot) => gauge(slot, { atb: 0, limit: 0 }));
  });
  at(6800, () => gauge(0, { atb: 900 }));
  at(7600, () => gauge(0, { atb: 1500 }));
  at(8000, () => diff({ target_hp_pct: 88, target_stagger_pct: 14 }));
  at(8600, () => gauge(0, { atb: 0 }));
  at(9000, () => hurt(0, 180));
  at(9400, () => gauge(1, { atb: 1500 }));
  at(9800, () => gauge(0, { limit: 0.35 }));
  at(10400, () => diff({ target_hp_pct: 71, target_stagger_pct: 46 }));
  at(11000, () => hurt(2, 870));
  at(11600, () => gauge(2, { atb: 2400, limit: 0.6 }));
  at(12200, () => diff({ target_hp_pct: 60, target_stagger_pct: 100 }));
  at(13000, () => diff({ game_pause: 1, game_state: 8 }));
  at(15000, () => diff({ game_pause: 0, game_state: 6, target_hp_pct: 22, target_stagger_pct: 100 }));
  at(16500, () => diff({ target_hp_pct: 0 }));
  at(17200, () => {
    field();
    diff({ gil: (live.gil ?? 0) + 214, play_time_s: (live.play_time_s ?? 0) + 60 });
  });

  // The resync the app sends on a timer, which a view must survive without flinching.
  at(20000, () => snapshot());
  at(23000, run);
}

run();

// --- manual controls, for building a single screen without waiting for the script ----------------

const KEYS: Record<string, () => void> = {
  '1': title,
  '2': () => {
    diff({ characters: captured.characters ?? [], party: captured.party ?? [], play_time_s: captured.play_time_s ?? 0 });
    field();
  },
  '3': () => {
    diff({ characters: captured.characters ?? [], party: captured.party ?? [], play_time_s: captured.play_time_s ?? 0 });
    battle(captured.target_hp_pct ?? 78, captured.target_stagger_pct ?? 13);
  },
  d: () => hurt(0, 150),
  h: () => hurt(0, -150),
  p: () => diff({ game_pause: live.game_pause ? 0 : 1 }),
  r: () => snapshot(),
  x: () => frame('detached', {}),
  s: () => {
    timeline.forEach(clearTimeout);
    timeline = [];
    console.info('[replay] script stopped; keys still work');
  },
  g: run,
};

window.addEventListener('keydown', (event) => KEYS[event.key]?.());
console.info('[replay] 1 title, 2 field, 3 battle, d/h hurt/heal Cloud, p pause, r resync, x detach, s stop, g restart');
