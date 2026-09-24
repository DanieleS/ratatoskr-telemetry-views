/**
 * The 43 watches, read as a game rather than as a list of numbers.
 *
 * Everything the components render comes from here, so all the profile's quirks are dealt with in one
 * place: the derived arrays that are index-aligned to `characters`, the max-HP watches that only
 * exist for the three starting characters, the combo counter that is stored in thousandths.
 *
 * The shapes are the contract's generated types, and they say what the stream really does: every
 * value, every record field and every collection entry may be `null`. Nothing here asserts
 * otherwise; each read decides what an unreadable value means for the thing being drawn.
 */
import { computed, ref, watch } from 'vue';
import { meta, previous, pulses, values, type Values } from '../stream';
import { prettify } from './labels';
import { characterMeta, characterTitle, type Sigil } from './characters';

// --- raw shapes, exactly as the contract describes them ----------------------------------------

/** The element type of an array-valued watch. */
type Element<T> = T extends readonly (infer E)[] ? E : never;
/** One entry of a collection watch, with the "unreadable element" case taken out. */
type Entry<K extends keyof Values> = NonNullable<Element<NonNullable<Values[K]>>>;

type RawCharacter = Entry<'characters'>;
type RawEnemy = Entry<'enemies'>;
type RawMod = Entry<'zale_trinket0_mods'>;
type RawUpgrade = Entry<'zale_upgrades'>;

// --- typed reads ------------------------------------------------------------------------------

/**
 * A collection's entries, keeping each one's position. Positions matter here: the derived
 * `attack_rating` and `defense_rating` are index-aligned to `characters`, and enemies are compared
 * slot by slot. An unreadable entry is `null` and is dropped *after* its index is taken, so it
 * never shifts its neighbours.
 */
function entries<T>(list: readonly (T | null)[] | null | undefined): Array<{ raw: T; index: number }> {
  const out: Array<{ raw: T; index: number }> = [];
  (list ?? []).forEach((raw, index) => {
    if (raw != null) out.push({ raw, index });
  });
  return out;
}

/** A list watch with its unreadable entries removed, for lists whose positions mean nothing. */
function known<T>(list: readonly (T | null)[] | null | undefined): T[] {
  return (list ?? []).filter((item): item is T => item != null);
}

/** `in_combat`, `paused` and friends are integer flags, not booleans. */
function flag(value: number | null | undefined): boolean {
  return (value ?? 0) !== 0;
}

/**
 * The watches the profile derives for the three starting characters only. They are separate watches
 * per character (`zale_max_hp`, …), so they are listed rather than built from the id: a name the
 * contract does not have would not compile.
 */
const PER_CHARACTER: Record<string, () => {
  maxHp: number | null | undefined;
  maxSp: number | null | undefined;
  mods: [RawMod | null, 'trinket_1' | 'trinket_2'][];
  upgrades: readonly (RawUpgrade | null)[] | null | undefined;
}> = {
  ZALE: () => ({
    maxHp: values.zale_max_hp,
    maxSp: values.zale_max_sp,
    mods: [
      ...(values.zale_trinket0_mods ?? []).map((mod): [RawMod | null, 'trinket_1'] => [mod, 'trinket_1']),
      ...(values.zale_trinket1_mods ?? []).map((mod): [RawMod | null, 'trinket_2'] => [mod, 'trinket_2']),
    ],
    upgrades: values.zale_upgrades,
  }),
  VALERE: () => ({
    maxHp: values.valere_max_hp,
    maxSp: values.valere_max_sp,
    mods: [
      ...(values.valere_trinket0_mods ?? []).map((mod): [RawMod | null, 'trinket_1'] => [mod, 'trinket_1']),
      ...(values.valere_trinket1_mods ?? []).map((mod): [RawMod | null, 'trinket_2'] => [mod, 'trinket_2']),
    ],
    upgrades: values.valere_upgrades,
  }),
  GARL: () => ({
    maxHp: values.garl_max_hp,
    maxSp: values.garl_max_sp,
    mods: [
      ...(values.garl_trinket0_mods ?? []).map((mod): [RawMod | null, 'trinket_1'] => [mod, 'trinket_1']),
      ...(values.garl_trinket1_mods ?? []).map((mod): [RawMod | null, 'trinket_2'] => [mod, 'trinket_2']),
    ],
    upgrades: values.garl_upgrades,
  }),
};

// --- world ------------------------------------------------------------------------------------

export const world = computed(() => {
  const guid = values.level_guid;
  const levels = known(values.levels);
  const here = guid ? levels.find((level) => level.guid === guid) : undefined;
  return {
    /** Some level labels arrive already readable ("Lucent"), others as keys. prettify takes both. */
    location: prettify(here?.label ?? here?.level_id ?? null),
    inCombat: flag(values.in_combat),
    paused: flag(values.paused),
    cutscenes: values.cutscene_count ?? 0,
    dialogs: values.dialog_boxes ?? 0,
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

/** A trinket modifier that could be read well enough to say what it does. */
export interface Mod {
  kind: string | null;
  stat: number;
  amount: number;
  /** The trinket it comes from, already prettified. */
  source: string;
}

export interface Upgrade {
  stat: number;
  count: number;
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
  mods: Mod[];
  upgrades: Upgrade[];
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

function memberOf(raw: RawCharacter & { id: string }, index: number): Member {
  const info = characterMeta(raw.id);
  const derived = PER_CHARACTER[raw.id.toUpperCase()]?.();
  const attack = values.attack_rating?.[index] ?? null;
  const defense = values.defense_rating?.[index] ?? null;

  // The profile derives physical attack and defence but not their magical twins, so the view adds
  // them the same way: base plus whatever the equipped piece contributes.
  const magicAttack =
    raw.base_matk == null ? null : raw.base_matk + (raw.weapon_matk ?? 0);
  const magicDefense =
    raw.base_mdef == null ? null : raw.base_mdef + (raw.armor_mdef ?? 0);

  const was = previous.characters?.find((entry) => entry?.id === raw.id);
  const falling = was?.hp != null && raw.hp != null && raw.hp < was.hp;

  // A modifier or upgrade with an unreadable stat or amount has nothing to say, so it is left out
  // rather than drawn as a guess.
  const mods: Mod[] = [];
  for (const [mod, slot] of derived?.mods ?? []) {
    if (mod?.stat != null && mod.amount != null) {
      mods.push({ kind: mod.kind, stat: mod.stat, amount: mod.amount, source: prettify(raw[slot]) });
    }
  }
  const upgrades: Upgrade[] = [];
  for (const upgrade of known(derived?.upgrades)) {
    if (upgrade.stat != null && upgrade.count != null && upgrade.count > 0) {
      upgrades.push({ stat: upgrade.stat, count: upgrade.count });
    }
  }

  return {
    id: raw.id,
    name: info.name || prettify(raw.id),
    title: characterTitle(raw.id, raw.class_id),
    sigil: info.sigil,
    accent: info.accent,
    hp: raw.hp,
    maxHp: derived?.maxHp ?? null,
    sp: raw.sp,
    maxSp: derived?.maxSp ?? null,
    boost: raw.boost_level ?? 0,
    atk: attack,
    def: defense,
    matk: magicAttack,
    mdef: magicDefense,
    equipment: equipmentOf(raw),
    mods,
    upgrades,
    isLeader: values.leader === raw.id,
    // `characters` is one watch, so any member's HP moving pulses all of them. Good enough for a
    // flash; the falling flag above is what decides whether it reads as damage.
    hpPulse: pulses.characters ?? 0,
    hpFalling: falling,
  };
}

/**
 * Everyone the game knows about, in the profile's order. A character whose id could not be read is
 * left out: without an id it cannot be matched to the party, named, or told apart from the others.
 */
export const roster = computed<Member[]>(() =>
  entries(values.characters).flatMap(({ raw, index }) => {
    const id = raw.id;
    return id ? [memberOf({ ...raw, id }, index)] : [];
  }),
);

/** The active party, in the game's own order. */
export const party = computed<Member[]>(() => {
  const ids = known(values.party);
  const everyone = roster.value;
  return ids
    .map((id) => everyone.find((member) => member.id === id))
    .filter((member): member is Member => !!member);
});

export const progress = computed(() => {
  const raw = values.party_progress;
  return {
    level: raw?.level ?? null,
    totalXp: raw?.total_xp ?? null,
    unspentXp: raw?.unspent_xp ?? null,
    step: values.upgrade_step ?? null,
    /**
     * Both roster watches sum over the *whole* `characters` collection — all nine entries, including
     * characters who have not joined and two 280 HP entries that look like scripted fights. So this
     * reads 1086 for a party of three carrying 239 between them, and `roster_downed` would count a
     * character sitting at zero who is nowhere near the fight. Useful, but not what "the party" means:
     * anything about the people actually playing comes from `partyVitals` below.
     */
    rosterHp: values.roster_hp_total ?? null,
    rosterDowned: values.roster_downed ?? 0,
    // The collection's own length, unreadable entries included: it is how many the game holds.
    rosterSize: values.characters?.length ?? 0,
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
  const raw = values.party_resources;
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
  const was = previous.enemies;

  return entries(values.enemies).map(({ raw, index }) => ({
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
    falling: ((): boolean => {
      const previousEntry: RawEnemy | null | undefined = was?.[index];
      if (!previousEntry || previousEntry.label !== raw.label) return false;
      return previousEntry.hp != null && raw.hp != null && raw.hp < previousEntry.hp;
    })(),
  }));
});

export const encounterXp = computed(() => values.encounter_xp ?? null);

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
  const catalog = new Map<string, Entry<'item_catalog'>>();
  for (const entry of known(values.item_catalog)) {
    if (entry.guid) catalog.set(entry.guid, entry);
  }
  const groups = new Map<string, Array<{ name: string; qty: number | null }>>();

  for (const held of known(values.inventory)) {
    const entry = held.guid ? catalog.get(held.guid) : undefined;
    // An item held but absent from the catalogue would be a profile bug; show it rather than hide it.
    const kind = entry?.kind ?? 'KeyItem';
    const name = entry ? prettify(entry.label) : (held.guid ?? '?').slice(0, 8);
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
  // A game whose party has not been built yet: the title screen and the main menu both land here,
  // because neither has a party to draw.
  if (!meta.attached || party.value.length === 0) return 'idle';
  return combatSettled.value ? 'battle' : 'voyage';
});

/** The line the header banner shows: whatever is most worth saying about right now. */
export const headline = computed(() => {
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
