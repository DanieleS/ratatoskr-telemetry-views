/**
 * The 43 watches, read as a game rather than as a list of numbers.
 *
 * Everything the components render comes from here, so all the profile's quirks are dealt with in one
 * place: the derived arrays that are index-aligned to `characters`, the max-HP watches that only
 * exist for the three starting characters, the combo counter that is stored in thousandths.
 */
import { computed, ref, watch } from 'vue';
import { meta, previous, pulses, values } from '../scry/store';
import { prettify } from './labels';
import { characterMeta, characterTitle, type Sigil } from './characters';

// --- raw shapes, exactly as the profile reports them -------------------------------------------

interface RawCharacter {
  id: string;
  class_id: string | null;
  hp: number | null;
  sp: number | null;
  base_hp: number | null;
  base_sp: number | null;
  base_patk: number | null;
  base_pdef: number | null;
  base_matk: number | null;
  base_mdef: number | null;
  boost_level: number | null;
  weapon: string | null;
  armor: string | null;
  trinket_1: string | null;
  trinket_2: string | null;
  group_trinket: string | null;
  weapon_patk: number | null;
  weapon_matk: number | null;
  armor_pdef: number | null;
  armor_mdef: number | null;
}

interface RawEnemy {
  label: string | null;
  hp: number | null;
  max_hp: number | null;
  level: number | null;
  patk: number | null;
  pdef: number | null;
  matk: number | null;
  mdef: number | null;
}

interface RawMod {
  kind: string | null;
  stat: number;
  amount: number;
}

interface RawUpgrade {
  stat: number;
  count: number;
}

// --- typed reads ------------------------------------------------------------------------------

/** A watch that is absent and a watch that went unreadable both read as null here. */
function number(name: string): number | null {
  const value = values[name];
  return typeof value === 'number' ? value : null;
}

function list<T>(name: string): T[] {
  const value = values[name];
  return Array.isArray(value) ? (value as T[]) : [];
}

function record<T>(name: string): T | null {
  const value = values[name];
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null;
}

function text(name: string): string | null {
  const value = values[name];
  return typeof value === 'string' ? value : null;
}

/** `in_combat`, `paused` and friends are i32 flags, not booleans. */
function flag(name: string): boolean {
  return (number(name) ?? 0) !== 0;
}

// --- world ------------------------------------------------------------------------------------

export const world = computed(() => {
  const guid = text('level_guid');
  const levels = list<{ guid: string; label: string | null; level_id: string | null }>('levels');
  const here = guid ? levels.find((level) => level.guid === guid) : undefined;
  return {
    /** Some level labels arrive already readable ("Lucent"), others as keys. prettify takes both. */
    location: prettify(here?.label ?? here?.level_id ?? null),
    inCombat: flag('in_combat'),
    paused: flag('paused'),
    cutscenes: number('cutscene_count') ?? 0,
    dialogs: number('dialog_boxes') ?? 0,
    knownLevels: levels.length,
  };
});

// --- party ------------------------------------------------------------------------------------

export interface Equipment {
  slot: string;
  icon: 'weapon' | 'armor' | 'trinket' | 'group';
  label: string;
  /** What the piece contributes, when the profile reports it. */
  detail: string;
}

export interface Member {
  id: string;
  name: string;
  title: string;
  sigil: Sigil;
  accent: string;
  hp: number | null;
  /**
   * Null when the profile has no max for this character: the derived watches cover only Zale, Valere
   * and Garl, so a later party member shows a number without a bar rather than a bar that lies.
   */
  maxHp: number | null;
  sp: number | null;
  maxSp: number | null;
  boost: number;
  atk: number | null;
  def: number | null;
  matk: number | null;
  mdef: number | null;
  equipment: Equipment[];
  mods: Array<RawMod & { source: string }>;
  upgrades: RawUpgrade[];
  isLeader: boolean;
  /** Bumped whenever HP was reported changed, and whether that change was downward. */
  hpPulse: number;
  hpFalling: boolean;
}

function equipmentOf(raw: RawCharacter): Equipment[] {
  const pieces: Equipment[] = [];
  const bonus = (patk: number | null, matk: number | null, pdef: number | null, mdef: number | null) =>
    [
      patk ? `+${patk} ATK` : '',
      matk ? `+${matk} M.ATK` : '',
      pdef ? `+${pdef} DEF` : '',
      mdef ? `+${mdef} M.DEF` : '',
    ]
      .filter(Boolean)
      .join('  ');

  if (raw.weapon) {
    pieces.push({
      slot: 'Weapon',
      icon: 'weapon',
      label: prettify(raw.weapon),
      detail: bonus(raw.weapon_patk, raw.weapon_matk, null, null),
    });
  }
  if (raw.armor) {
    pieces.push({
      slot: 'Armor',
      icon: 'armor',
      label: prettify(raw.armor),
      detail: bonus(null, null, raw.armor_pdef, raw.armor_mdef),
    });
  }
  for (const trinket of [raw.trinket_1, raw.trinket_2]) {
    if (trinket) {
      pieces.push({ slot: 'Trinket', icon: 'trinket', label: prettify(trinket), detail: '' });
    }
  }
  if (raw.group_trinket) {
    pieces.push({
      slot: 'Group',
      icon: 'group',
      label: prettify(raw.group_trinket),
      detail: 'shared by the party',
    });
  }
  return pieces;
}

function memberOf(raw: RawCharacter, index: number): Member {
  const key = raw.id.toLowerCase();
  const info = characterMeta(raw.id);
  const attack = list<number | null>('attack_rating')[index] ?? null;
  const defense = list<number | null>('defense_rating')[index] ?? null;

  // The profile derives physical attack and defence but not their magical twins, so the view adds
  // them the same way: base plus whatever the equipped piece contributes.
  const magicAttack =
    raw.base_matk == null ? null : raw.base_matk + (raw.weapon_matk ?? 0);
  const magicDefense =
    raw.base_mdef == null ? null : raw.base_mdef + (raw.armor_mdef ?? 0);

  const before = previous[`characters`];
  let falling = false;
  if (Array.isArray(before)) {
    const was = (before as RawCharacter[]).find((entry) => entry.id === raw.id);
    falling = was?.hp != null && raw.hp != null && raw.hp < was.hp;
  }

  return {
    id: raw.id,
    name: info.name || prettify(raw.id),
    title: characterTitle(raw.id, raw.class_id),
    sigil: info.sigil,
    accent: info.accent,
    hp: raw.hp,
    maxHp: number(`${key}_max_hp`),
    sp: raw.sp,
    maxSp: number(`${key}_max_sp`),
    boost: raw.boost_level ?? 0,
    atk: attack,
    def: defense,
    matk: magicAttack,
    mdef: magicDefense,
    equipment: equipmentOf(raw),
    mods: [
      ...list<RawMod>(`${key}_trinket0_mods`).map((mod) => ({ ...mod, source: prettify(raw.trinket_1) })),
      ...list<RawMod>(`${key}_trinket1_mods`).map((mod) => ({ ...mod, source: prettify(raw.trinket_2) })),
    ],
    upgrades: list<RawUpgrade>(`${key}_upgrades`).filter((upgrade) => upgrade.count > 0),
    isLeader: text('leader') === raw.id,
    // `characters` is one watch, so any member's HP moving pulses all of them. Good enough for a
    // flash; the falling flag above is what decides whether it reads as damage.
    hpPulse: pulses['characters'] ?? 0,
    hpFalling: falling,
  };
}

/** Everyone the game knows about, in the profile's order. */
export const roster = computed<Member[]>(() =>
  list<RawCharacter>('characters').map((raw, index) => memberOf(raw, index)),
);

/** The active party, in the game's own order. */
export const party = computed<Member[]>(() => {
  const ids = list<string>('party');
  const everyone = roster.value;
  return ids
    .map((id) => everyone.find((member) => member.id === id))
    .filter((member): member is Member => !!member);
});

export const progress = computed(() => {
  const raw = record<{ level: number; total_xp: number; unspent_xp: number }>('party_progress');
  return {
    level: raw?.level ?? null,
    totalXp: raw?.total_xp ?? null,
    unspentXp: raw?.unspent_xp ?? null,
    step: record<Record<string, number>>('upgrade_step'),
    /**
     * Both roster watches sum over the *whole* `characters` collection — all nine entries, including
     * characters who have not joined and two 280 HP entries that look like scripted fights. So this
     * reads 1086 for a party of three carrying 239 between them, and `roster_downed` would count a
     * character sitting at zero who is nowhere near the fight. Useful, but not what "the party" means:
     * anything about the people actually playing comes from `partyVitals` below.
     */
    rosterHp: number('roster_hp_total'),
    rosterDowned: number('roster_downed') ?? 0,
    rosterSize: roster.value.length,
  };
});

/** The three who are actually out there, totalled over the party and nobody else. */
export const partyVitals = computed(() => {
  const members = party.value;
  const hp = members.reduce((sum, member) => sum + (member.hp ?? 0), 0);
  // Only a total if every member has a known maximum; the profile derives one for three characters.
  const max = members.every((member) => member.maxHp != null)
    ? members.reduce((sum, member) => sum + (member.maxHp ?? 0), 0)
    : null;
  return {
    hp,
    max,
    downed: members.filter((member) => member.hp === 0).length,
    size: members.length,
  };
});

export const resources = computed(() => {
  const raw = record<{ combo_points: number; max_combo_points: number; ult_points: number }>(
    'party_resources',
  );
  const max = raw?.max_combo_points ?? 0;
  const stored = raw?.combo_points ?? 0;
  // One snapshot showed 3000 against a max of 3, so the counter looks like thousandths. Scaling only
  // when it overshoots the max keeps a plain counter working if that reading turns out to be wrong.
  const combo = max > 0 && stored > max ? stored / 1000 : stored;
  return {
    combo: Math.min(combo, max),
    maxCombo: max,
    ult: raw?.ult_points ?? 0,
  };
});

/** Present only in battle. The watch reads null the rest of the time. */
export const enemies = computed(() => {
  const before = previous['enemies'];
  const was = Array.isArray(before) ? (before as RawEnemy[]) : null;

  return list<RawEnemy>('enemies').map((raw, index) => ({
    name: prettify(raw.label),
    hp: raw.hp,
    maxHp: raw.max_hp,
    level: raw.level,
    atk: raw.patk,
    def: raw.pdef,
    matk: raw.matk,
    mdef: raw.mdef,
    /**
     * Compared by position, not by name: the watch is an array of the current encounter's slots, and
     * two of the same monster are two entries with the same label. A slot that changed identity
     * between frames simply does not read as damage.
     */
    falling: (() => {
      const previousEntry = was?.[index];
      if (!previousEntry || previousEntry.label !== raw.label) return false;
      return previousEntry.hp != null && raw.hp != null && raw.hp < previousEntry.hp;
    })(),
  }));
});

export const encounterXp = computed(() => number('encounter_xp'));

// --- inventory --------------------------------------------------------------------------------

const KIND_NAMES: Record<string, string> = {
  Snack: 'Snacks',
  Ingredient: 'Ingredients',
  CharacterWeapon: 'Weapons',
  CharacterArmor: 'Armor',
  CharacterTrinket: 'Trinkets',
  RelicItem: 'Relics',
  KeyItem: 'Key Items',
  ValuableItem: 'Valuables',
  RecipeUnlockItem: 'Recipes',
  SheetMusicItem: 'Sheet Music',
  PortableGPIItem: 'Pocket Items',
  StoryArtifactItem: 'Story Artifacts',
  CandyItem: 'Candy',
};

/** Roughly what a player cares about first, and what they will never scroll to. */
const KIND_ORDER = [
  'Snack',
  'Ingredient',
  'CharacterWeapon',
  'CharacterArmor',
  'CharacterTrinket',
  'RelicItem',
  'ValuableItem',
  'CandyItem',
  'RecipeUnlockItem',
  'SheetMusicItem',
  'StoryArtifactItem',
  'KeyItem',
  'PortableGPIItem',
];

export const inventory = computed(() => {
  const catalog = new Map(
    list<{ guid: string; kind: string; label: string }>('item_catalog').map((entry) => [
      entry.guid,
      entry,
    ]),
  );
  const groups = new Map<string, Array<{ name: string; qty: number }>>();

  for (const held of list<{ guid: string; qty: number }>('inventory')) {
    const entry = catalog.get(held.guid);
    // An item held but absent from the catalogue would be a profile bug; show it rather than hide it.
    const kind = entry?.kind ?? 'KeyItem';
    const name = entry ? prettify(entry.label) : held.guid.slice(0, 8);
    const bucket = groups.get(kind) ?? [];
    bucket.push({ name, qty: held.qty });
    groups.set(kind, bucket);
  }

  return [...groups.entries()]
    .sort((a, b) => {
      const rank = (kind: string) => {
        const at = KIND_ORDER.indexOf(kind);
        return at === -1 ? KIND_ORDER.length : at;
      };
      return rank(a[0]) - rank(b[0]);
    })
    .map(([kind, items]) => ({
      kind,
      title: KIND_NAMES[kind] ?? prettify(kind),
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
});

// --- gold, when it exists ---------------------------------------------------------------------

/**
 * The profile has no gold watch yet. The header is built to show one the day it appears, and to show
 * unspent XP until then, so nothing has to be redesigned for it.
 */
export const gold = computed(() => number('gold'));

// --- which scene the panel is showing ---------------------------------------------------------

export type Scene = 'idle' | 'voyage' | 'battle';

/**
 * Leaving a battle is delayed a beat.
 *
 * Entering is immediate — a fight starting is exactly when the panel should already be showing the
 * fight. Leaving is not: `in_combat` drops on every transition inside an encounter, and a scene that
 * follows it exactly would strobe. Nothing is lost by lagging the exit.
 */
const combatSettled = ref(false);
let leaving: ReturnType<typeof setTimeout> | null = null;

watch(
  () => world.value.inCombat,
  (inCombat) => {
    if (leaving) {
      clearTimeout(leaving);
      leaving = null;
    }
    if (inCombat) {
      combatSettled.value = true;
    } else {
      leaving = setTimeout(() => {
        combatSettled.value = false;
        leaving = null;
      }, 1200);
    }
  },
  { immediate: true },
);

export const scene = computed<Scene>(() => {
  // No game, or a game whose party has not been built yet: the title screen and the main menu both
  // land here, because neither has a party to draw.
  if (!meta.attached || party.value.length === 0) return 'idle';
  return combatSettled.value ? 'battle' : 'voyage';
});

/** The line the header banner shows: whatever is most worth saying about right now. */
export const headline = computed(() => {
  if (meta.gone) return 'The stream has ended.';
  if (!meta.attached) return 'Waiting for a game…';
  if (party.value.length === 0) return 'Waiting for the party to set out…';
  if (world.value.paused) return 'Paused.';
  if (world.value.dialogs > 0) return 'Someone is talking.';
  if (world.value.cutscenes > 0) return 'A scene is playing.';
  if (scene.value === 'battle') {
    const count = enemies.value.length;
    if (count > 0) return `${count} ${count === 1 ? 'foe' : 'foes'} stand in the way.`;
    return 'In battle.';
  }
  if (world.value.location) return world.value.location;
  return 'On the voyage.';
});

export { meta };
