/**
 * The stand-in for Ratatoskr, so the view can be built in a browser.
 *
 * It drives the real bridge — `window.scry.onFrame` — with a real capture: `scry watch` writes one
 * JSON object per event, and the fixture vendored from scry-profiles is exactly that, an `attached`
 * event followed by one full `values` event. Everything after the first snapshot is invented, because
 * a one-tick capture cannot show a health bar moving.
 *
 * The capture predates `contract` on the wire (it was recorded with scry 0.1.0-alpha.2), so the
 * harness announces the contract version the fixture is filed under, as a current host would.
 *
 * Excluded from the production build (see main.ts). A view has no business being able to make up
 * telemetry on a device.
 */
import capture from '../../../fixtures/sea-of-stars/2.0/steam-first-tick.json?raw';
import manifest from '../manifest.json';
import type { Values } from '../stream';

/** The version directory the capture is filed under in fixtures/. */
const CAPTURE_VERSION = '2.0';

interface Event {
  event?: string;
  values?: Partial<Values>;
  process?: string;
  profile?: string;
}

/**
 * Read a stream of concatenated JSON objects.
 *
 * scry's output is JSON Lines-ish — objects one after another, pretty-printed across many lines — so
 * neither JSON.parse nor a split on newlines will do. Counting braces outside of strings will.
 */
function parseStream(text: string): Event[] {
  const events: Event[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '{') {
      if (depth === 0) start = at;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        events.push(JSON.parse(text.slice(start, at + 1)) as Event);
        start = -1;
      }
    }
  }

  return events;
}

const events = parseStream(capture);
const attached = events.find((event) => event.event === 'attached');
const first = events.find((event) => event.event === 'values');

if (!first?.values) {
  throw new Error('The capture has no "values" event to replay.');
}

/** The live picture the harness mutates. Starts as the captured one. */
const live: Partial<Values> = structuredClone(first.values);
const initialParty = first.values.party ?? [];

function frame(kind: 'snapshot' | 'diff' | 'detached', body: unknown) {
  // Through the same door the app uses, quoted-and-parsed included, so the harness cannot
  // accidentally be gentler than the real thing.
  window.scry?.onFrame(kind, JSON.parse(JSON.stringify(body)));
}

function snapshot(isAttached = true) {
  frame('snapshot', {
    attached: isAttached,
    slug: 'Sea of Stars',
    process: attached?.process ?? 'SeaOfStars.exe',
    profile: attached?.profile ?? null,
    contract: { id: manifest.contract.id, version: CAPTURE_VERSION },
    values: isAttached ? live : {},
  });
}

function diff(patch: Partial<Values>) {
  Object.assign(live, patch);
  frame('diff', patch);
}

// --- a small script, so every scene gets exercised without anyone touching a keyboard ------------

function hurt(id: string, amount: number) {
  const roster = structuredClone(live.characters ?? []);
  const target = roster.find((one) => one?.id === id);
  if (!target || target.hp == null) return;
  target.hp = Math.max(0, target.hp - amount);
  diff({ characters: roster, roster_hp_total: roster.reduce((sum, one) => sum + (one?.hp ?? 0), 0) });
}

function heal(id: string, amount: number) {
  hurt(id, -amount);
}

const FOES = [
  { label: 'ENEMY_SAND_CRAB_NAME', hp: 120, max_hp: 120, level: 7, patk: 24, pdef: 18, matk: 9, mdef: 12 },
  { label: 'ENEMY_ROCK_GOLEM_NAME', hp: 260, max_hp: 260, level: 9, patk: 31, pdef: 27, matk: 4, mdef: 15 },
];

function startBattle() {
  diff({ in_combat: 1, enemies: structuredClone(FOES), encounter_xp: 84 });
}

function endBattle() {
  diff({ in_combat: 0, enemies: null, encounter_xp: null });
}

let timeline: number[] = [];

function at(ms: number, action: () => void) {
  timeline.push(window.setTimeout(action, ms));
}

function run() {
  timeline.forEach(clearTimeout);
  timeline = [];

  // Starts on the title screen: no party, which is exactly what the game reports there.
  const fullParty = structuredClone(live.party ?? []);
  diff({ party: [], combat_party: [] });
  snapshot();

  at(2500, () => diff({ party: fullParty, combat_party: fullParty }));

  at(6000, startBattle);
  at(7200, () => hurt('ZALE', 14));
  at(8100, () => diff({ party_resources: { combo_points: 1000, max_combo_points: 3, ult_points: 22 } }));
  at(8900, () => hurt('VALERE', 23));
  at(9600, () => {
    const foes = structuredClone(FOES);
    foes[0]!.hp = 44;
    diff({ enemies: foes });
  });
  at(10400, () => diff({ party_resources: { combo_points: 2000, max_combo_points: 3, ult_points: 61 } }));
  at(11200, () => hurt('GARL', 41));
  at(12000, () => {
    const foes = structuredClone(FOES);
    foes[0]!.hp = 0;
    foes[1]!.hp = 190;
    diff({ enemies: foes });
  });
  at(13200, () => hurt('ZALE', 9));
  at(14200, () => diff({ party_resources: { combo_points: 3000, max_combo_points: 3, ult_points: 100 } }));
  at(15500, endBattle);
  at(16500, () => {
    heal('ZALE', 23);
    heal('VALERE', 23);
    heal('GARL', 41);
    diff({ party_progress: { level: 6, total_xp: 1365, unspent_xp: 335 } });
  });

  // The resync the app sends on a timer, which a view must survive without flinching.
  at(19000, () => snapshot());
  at(22000, run);
}

run();

// --- manual controls, for building a single screen without waiting for the script ----------------

const KEYS: Record<string, () => void> = {
  '1': () => diff({ party: [], combat_party: [], in_combat: 0 }),
  '2': () => {
    const ids = structuredClone(initialParty);
    diff({ party: ids, combat_party: ids, in_combat: 0, enemies: null });
  },
  '3': startBattle,
  d: () => hurt('ZALE', 12),
  h: () => heal('ZALE', 12),
  r: () => snapshot(),
  x: () => frame('detached', {}),
  s: () => {
    timeline.forEach(clearTimeout);
    timeline = [];
    console.info('[replay] script stopped; keys still work');
  },
  p: run,
};

window.addEventListener('keydown', (event) => {
  const action = KEYS[event.key];
  if (action) action();
});

// A square frame around the view, because the panel this is drawn for is roughly square and a
// maximised browser window is not.
const style = document.createElement('style');
style.textContent = `
  body { display: grid; place-items: center; background: #05080f; }
  #view {
    width: min(96vw, 96vh);
    height: min(96vw, 96vh);
    outline: 1px solid #24456f;
    background: radial-gradient(120% 90% at 50% 0%, #14284a 0%, #0a1526 55%, #060c17 100%);
    overflow: hidden;
  }
`;
document.head.appendChild(style);

console.info(
  '[replay] scripted session running.\n' +
    '  1 title screen   2 voyage   3 battle\n' +
    '  d damage Zale    h heal Zale\n' +
    '  r resync snapshot  x detach\n' +
    '  s stop script    p restart script',
);
