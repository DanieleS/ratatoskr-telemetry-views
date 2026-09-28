/**
 * The nine watches, read as a game rather than as a list of numbers.
 *
 * Everything the components draw comes from here, so the profile's quirks live in one place: the
 * party is three indices into `characters` with 16 for an empty slot, the ATB gauge is 0–3000 in
 * two segments, Limit is 0–1, and the target's values exist only while the game draws its bar.
 *
 * Every value may be `null` or missing, and the types say so. Each read below decides what an
 * unreadable value means for the thing being drawn, and none of them invents a number.
 */
import { computed } from 'vue';
import { values } from '../stream';

/** What the game calls its first five characters, in the order of the `characters` table. */
const NAMES = ['Cloud', 'Barret', 'Tifa', 'Aerith', 'Red XIII'];

/** A party slot the game leaves empty. */
const EMPTY_SLOT = 16;

/** One ATB segment. The gauge holds two, and an action spends one. */
export const ATB_SEGMENT = 1500;

export type Scene = 'title' | 'field' | 'battle';

export interface Member {
  /** Position in the party, 0 for the leader. Also the index into `party_gauges`. */
  slot: number;
  name: string;
  level: number | null;
  hp: number | null;
  hpMax: number | null;
  mp: number | null;
  mpMax: number | null;
  /** 0–1, or null when either side of the ratio is unreadable. */
  hpRatio: number | null;
  mpRatio: number | null;
  /** Each ATB segment's fill, 0–1. Unreadable gauges are null, not empty. */
  atb: [number | null, number | null];
  /** 0–1. */
  limit: number | null;
}

function finite(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** `part / whole`, clamped, or null when either is unreadable or the whole is not positive. */
export function ratio(part: number | null | undefined, whole: number | null | undefined): number | null {
  const p = finite(part);
  const w = finite(whole);
  if (p === null || w === null || w <= 0) return null;
  return clamp01(p / w);
}

export function nameOf(index: number): string {
  return NAMES[index] ?? `Personaggio ${index + 1}`;
}

/** The members in the active party, leader first, skipping empty and unreadable slots. */
export const party = computed<Member[]>(() => {
  const slots = values.party ?? [];
  const characters = values.characters ?? [];
  const gauges = values.party_gauges ?? [];
  const out: Member[] = [];

  slots.forEach((index, slot) => {
    if (index == null || index === EMPTY_SLOT || index < 0 || index >= characters.length) return;
    const record = characters[index];
    const gauge = gauges[slot] ?? null;
    const atb = finite(gauge?.atb);
    const limit = finite(gauge?.limit);
    out.push({
      slot,
      name: nameOf(index),
      level: finite(record?.level),
      hp: finite(record?.hp),
      hpMax: finite(record?.hp_max),
      mp: finite(record?.mp),
      mpMax: finite(record?.mp_max),
      hpRatio: ratio(record?.hp, record?.hp_max),
      mpRatio: ratio(record?.mp, record?.mp_max),
      atb: atb === null ? [null, null] : [clamp01(atb / ATB_SEGMENT), clamp01((atb - ATB_SEGMENT) / ATB_SEGMENT)],
      limit: limit === null ? null : clamp01(limit),
    });
  });

  return out;
});

/**
 * The locked-on enemy, as the HUD draws it. Null when no enemy bar is on screen.
 *
 * Its name is the one on the bar the game shows, instance letter included ("Orco A"): the bar whose
 * visibility is 0. Null when that bar is unreadable, or shows no name.
 */
export const target = computed(() => {
  const hp = finite(values.target_hp_pct);
  if (hp === null) return null;
  const stagger = finite(values.target_stagger_pct);
  const bar = (values.enemy_bars ?? []).find((one) => one?.visibility === 0);
  const name = bar?.name?.trim();
  return {
    name: name ? name : null,
    hp: clamp01(hp / 100),
    stagger: stagger === null ? null : clamp01(stagger / 100),
  };
});

/**
 * Which screen to draw.
 *
 * The title screen reports the same game state as play (6), and even a running play time, so it is
 * told apart by its character table: before a save is loaded every record is level 1 with a max HP
 * of 0. A battle is whenever the game draws an enemy bar, because that is the only battle signal the
 * contract carries, and the one a player would recognise.
 */
export const scene = computed<Scene>(() => {
  if (!party.value.some((member) => (member.hpMax ?? 0) > 0)) return 'title';
  if (target.value) return 'battle';
  return 'field';
});

/** The system menu is open. The game keeps drawing whatever is behind it. */
export const paused = computed(() => (finite(values.game_pause) ?? 0) !== 0);

export const gil = computed(() => finite(values.gil));

/** Play time as the game's menu shows it, hours and minutes: `3:49`. */
export const playTime = computed(() => {
  const seconds = finite(values.play_time_s);
  if (seconds === null) return null;
  const total = Math.floor(seconds / 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
});

/**
 * Italian grouping on every number, four digits included: Italian's own rule groups only from five
 * digits up, so without `always` a party row would read `1225` next to a gil total of `14.820`.
 *
 * The cast is TypeScript's, not the runtime's: with `lib: ES2020`, lib.es2020.bigint.d.ts narrows
 * `useGrouping` back to a boolean, although the WebView (Chrome 90+) takes `'always'`.
 */
const numbers = new Intl.NumberFormat('it-IT', {
  useGrouping: 'always' as unknown as boolean,
  maximumFractionDigits: 0,
});

/** A whole number with Italian grouping (`1.225`), or a dash when it is unreadable. */
export function formatNumber(value: number | null): string {
  return value === null ? '—' : numbers.format(Math.round(value));
}

/** A 0–1 ratio as a whole percentage, or a dash. */
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

/** The HP bar's colour band, the way the game's HUD shifts it. */
export function hpBand(value: number | null): 'ok' | 'low' | 'danger' | 'unknown' {
  if (value === null) return 'unknown';
  if (value < 0.25) return 'danger';
  if (value < 0.5) return 'low';
  return 'ok';
}
