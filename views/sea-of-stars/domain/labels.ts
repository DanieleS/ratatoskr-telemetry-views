/**
 * Turning the game's localisation keys into something a human reads.
 *
 * scry reports what the game stores, and what Sea of Stars stores is the key, not the string:
 * `WEAPON_SILVER_BLADE_NAME`, `ARMOR_PIRATEGARB_NAME`, `Armor_BasicArmor_Name`. The localised text
 * lives in a table this profile does not read, so the view has to do the best it can with the key.
 *
 * Three passes, in order of how much they can be trusted:
 *   1. strip the prefix and the `_NAME` suffix — mechanical, always right;
 *   2. split on underscores and camelCase — mechanical, always right;
 *   3. split whatever is left against a word list — a guess, because `PIRATEGARB` carries no
 *      separator at all. Longest match wins, so PLATINUM beats PLATE; an unmatched remainder is
 *      kept as one word rather than being butchered.
 *
 * A key that comes out wrong is a cosmetic bug, never a functional one: add the word, or pin the
 * whole key in OVERRIDES.
 */

const PREFIXES = [
  'GROUP_TRINKET_',
  'TRINKET_',
  'WEAPON_',
  'ARMOR_',
  'KEYITEM_',
  'KEY_ITEM_',
  'ENEMY_',
  'STORYARTIFACT_',
  'VALUABLEITEM_',
  'RECIPEUNLOCK_',
  'SHEETMUSIC_',
  'PORTABLEGPI_',
  'ITEM_',
  'RELIC_',
  'RECIPE_',
  'INGREDIENT_',
  'VALUABLE_',
  'SNACK_',
  'CANDY_',
];

const SUFFIXES = ['_NAME', '_DESC', '_DESCRIPTION'];

/** Keys the word list cannot rescue, mostly the game's own typos and abbreviations. */
const OVERRIDES: Record<string, string> = {
  ADVENRURERVEST: 'Adventurer Vest', // the typo is in the game's data, not here
  TPMUSHROOMPIE: 'TP Mushroom Pie',
  GARLSAPRON: "Garl's Apron",
  REAPERSMERCY: "Reaper's Mercy",
  LUANASMIGHT: "Luana's Might",
  SOLENSLIGHT: "Solen's Light",
  FIRMAMENTSEDGE: "Firmament's Edge",
  MINERSSMOCK: "Miner's Smock",
  SOULBOUNTCATALYST: 'Soulbount Catalyst',
  AMULETONBOARDING: 'Amulet (Onboarding)',
  TICKETTOCKET: 'Ticket to Cket',
  PUDDINGCHÔMEUR: 'Pudding Chômeur',
  LVLUP_AUTOHEAL: 'Level-Up Auto-Heal',
  STORYTELLING_HP: 'Storytelling HP',
};

/**
 * Words the splitter knows. Not a dictionary of English — a dictionary of *this game*, harvested
 * from the 439 entries of its own item catalogue.
 */
const WORDS = [
  // materials, qualities, elements
  'ADAMANTINE', 'AETHERWOOD', 'BAMBOO', 'BASIC', 'CALCITE', 'CELESTIAL', 'CLOCKWORK', 'CLOUD',
  'CLOUDY', 'CORAL', 'COSMIC', 'CRYOSTEEL', 'CYPRESS', 'DOCARRI', 'DULL', 'EARTHSHINE', 'ECLIPSE',
  'ENCHANTED', 'FORBIDDEN', 'GOLDEN', 'GOURMET', 'HEARTY', 'HELIACAL', 'HERBED', 'HIDDEN',
  'IGNEOUS', 'INCOMPLETE', 'LEGENDARY', 'LUCENT', 'MAGIC', 'MOONSTONE', 'MYSTERY', 'NANO',
  'NEOBSIDIAN', 'OAKEN', 'OSSEOUS', 'PEARLESCENT', 'PHANTOM', 'PHOSPHORITE', 'PIRATE', 'PLASMA',
  'PLIANT', 'REVENANT', 'ROSEWOOD', 'SCRIMSHAWED', 'SHIMMERING', 'SHROOMY', 'SILKEN', 'SPARK',
  'SPECTRAL', 'TATTERED', 'THALASSIC', 'TRUESILVER', 'TRUESTRIKE', 'VITRIC', 'VOLCANIC', 'WALNUT',
  'WIRE', 'WITHERED',
  // gear
  'AMULET', 'APOGEE', 'APRON', 'ARMOR', 'BLADE', 'BRACELET', 'BRACER', 'CANNON', 'CAPE', 'CATALYST',
  'CHAIN', 'CIRCLET', 'CLOAK', 'CORK', 'DAGGERS', 'EARRING', 'EARRINGS', 'EDGE', 'GARB', 'GLASS',
  'LID', 'LINK', 'MESH', 'PENDANT', 'PLATE', 'PLUME', 'SASH', 'SHELL', 'SHIV', 'SHORTS', 'SIGNET',
  'SIMULACRUM', 'SLICER', 'SMOCK', 'STAFF', 'SWORD', 'VEST',
  // classes, roles, names
  'ARCHER', 'ASSASSIN', 'BOXER', 'CHAMPION', 'CHARACTER', 'ENGINEER', 'GAMBLER', 'KNIGHT', 'MAGE',
  'MINERS', 'MORAINE', 'NINJA', 'PRIEST', 'REAPERS', 'ROMAYA', 'WARLOCK', 'WARRIOR',
  // places and structures
  'CAVERN', 'DUNGEON', 'FACTORY', 'FISHING', 'GARDEN', 'GATE', 'HUT', 'MARKET', 'MARSH',
  'MOONCRADLE', 'OFFICE', 'SHOP', 'SONGSHROOM', 'SPA', 'TAVERN', 'TABLE',
  // cosmos
  'MOON', 'RAY', 'RAYS', 'SHARD', 'SHARDS', 'SOLSTICE', 'STAR', 'SUN', 'SUNSET',
  // food
  'BOUILLABAISSE', 'BURGER', 'CANDY', 'CARAMEL', 'CLUB', 'CORN', 'FEAST', 'FILET', 'JAM', 'MAPLE',
  'MUSHROOM', 'OMELETTE', 'PAPILLOTTE', 'PEACH', 'PIE', 'PUDDING', 'ROAST', 'SALAD', 'SANDWICH',
  'SCRAMBLE', 'SHRIMP', 'STEW', 'STRAWBERRY', 'STRUDEL', 'SYRUP', 'TOMATO', 'YAKITORI',
  // key items and mechanics
  'AIR', 'BLOCK', 'BLUEPRINT', 'BOOST', 'BOUNCE', 'CERTIFICATE', 'CHIP', 'CRANE', 'CRATE', 'DATA',
  'DECRYPTED', 'DISC', 'ELEMENTAL', 'FISH', 'FLAME', 'GRAPLOU', 'HAMMER', 'HEALTH', 'HEXAGONAL',
  'HYDRALION', 'INGREDIENT', 'INJECTOR', 'JOURNAL', 'KEY', 'LADDER', 'LADDERSHIP', 'LEECHING',
  'LEVER', 'LIGHT', 'LOCK', 'MATERIAL', 'MERCY', 'MIGHT', 'MIRROR', 'MUSIC', 'PAD', 'PASS',
  'PEARL', 'PIECE', 'PLATFORM', 'POCKET', 'POLE', 'PORTRAIT', 'POWER', 'PUSH', 'RAIL', 'RANK',
  'RAW', 'SEASHELL', 'SHEET', 'SOCKET', 'SPIN', 'SPIRIT', 'STORYTELLING', 'TEST', 'TICKET', 'TIME',
  'TRIANGULAR', 'UPGRADED', 'VIAL', 'WERE', 'WHEELS', 'WHEEL',
  // metals and ranks
  'BRONZE', 'COPPER', 'DIAMOND', 'GOLD', 'PLATINUM', 'SILVER',
  // colours
  'GREEN', 'PURPLE', 'YELLOW', 'BLUE', 'RED',
  // clarity, mercy, etc.
  'CLARITY', 'LEAF', 'BELT', 'THORN', 'ABACUS', 'CORNUCOPIA', 'SENSE', 'SIXTH', 'GUARDIAN', 'AURA',
  'ADAMANT', 'EGG', 'DAIRY', 'MEAT', 'BOY',
  // story artifacts, quest items and the odd corners of the catalogue
  'AND', 'AUTO', 'BAD', 'CHEST', 'CROWN', 'CUTSCENE', 'DEFAULT', 'ELDER', 'ENGINEERS', 'ESTRISTAE',
  'FLARE', 'GIANT', 'GODDESS', 'GRAINS', 'GUN', 'HAUNTED', 'HEAL', 'HELM', 'INGOT', 'JAR', 'KHUKKAR',
  'KID', 'MANSION', 'METTLE', 'MIST', 'MOLEKINS', 'NIGHT', 'NIGHTMARE', 'NOMAD', 'OBSIDIAN',
  'REGULAR', 'ROSE', 'SAPPHIRE', 'SEA', 'SEQUENT', 'SHROUD', 'SISTERS', 'SKY', 'SLEEPER', 'STORM',
  'SUPREME', 'SURF', 'TACTICIAN', 'TATAKI', 'THREE', 'TURF', 'VAMPIRE', 'COOKIE',
  // place names, for the `levels` collection
  'ABYSS', 'BRIDGE', 'BRISK', 'CENTER', 'CERULEAN', 'CHAPITEAU', 'CURSED', 'EXPANSE', 'FLESHMANCER',
  'HAMLET', 'HORLOGE', 'INFINITE', 'ISLAND', 'KILN', 'LAIR', 'LAKE', 'LOST', 'MAP', 'MOUNTAIN',
  'NETWORK', 'ONES', 'OUTPOST', 'PLANET', 'PORT', 'QUEENS', 'SHRINE', 'SPEEDBALL', 'THRONE', 'TOWN',
  'TREK', 'UNDERGROUND', 'VILLAGE', 'WORLD', 'CAVE', 'COAST', 'FOREST', 'KEEP', 'MINE', 'MINES',
  'PEAK', 'RUINS', 'TEMPLE', 'TOWER', 'VALE', 'WATCH', 'YARD', 'SECRET', 'DOOR', 'SUNKEN', 'RUIN',
  'DISK',
];

/** Tokens that are abbreviations, so title case would be wrong: "Storytelling Hp" reads badly. */
const ACRONYMS = new Set(['HP', 'SP', 'TP', 'XP', 'MP', 'GPI']);

/** Longest first, so a scan prefers PLATINUM over PLATE. */
const DICTIONARY = [...new Set(WORDS)].sort((a, b) => b.length - a.length);

/**
 * Shortest word the splitter is allowed to pull out of a run of letters.
 *
 * Three-letter words are where this goes wrong: `SAND` is not in the dictionary, `AND` is, and the
 * segmentation that scores best on raw coverage is "S" + "AND" — which is how a sand crab came to be
 * called a "S and Crab". Below this length a word has to earn its place by being the whole token
 * (`KEY`, `AIR`, `SUN` still read correctly, because an unrecognised run is title-cased as one word).
 */
const MIN_SPLIT = 4;

/**
 * Words that stay lowercase inside a name, the way a title would have them. No single letters: the
 * game labels its three sunken-ruin disks A, B and C, and "disk a" is not what it means.
 */
const MINOR = new Set(['of', 'to', 'the', 'and', 'in']);

function stripAffixes(key: string): string {
  let core = key;
  const upper = core.toUpperCase();
  for (const prefix of PREFIXES) {
    if (upper.startsWith(prefix)) {
      core = core.slice(prefix.length);
      break;
    }
  }
  const tail = core.toUpperCase();
  for (const suffix of SUFFIXES) {
    if (tail.endsWith(suffix)) {
      core = core.slice(0, -suffix.length);
      break;
    }
  }
  return core;
}

/**
 * Break a run of letters against the dictionary.
 *
 * Scored over the whole token rather than greedily left to right, because greedy is actively wrong
 * here: scanning `SPEEDBALLNETWORKISLAND` from the left, `AND` matches inside `ISLAND` and the name
 * comes out as "…isl and". Each word scores the square of its length so long words dominate, every
 * character no word claims costs 1, and the best-scoring segmentation of the whole token wins —
 * which is `ISLAND` (36) over unmatched `ISL` (-3) plus `AND` (9).
 */
function splitCompound(token: string): string[] {
  const upper = token.toUpperCase();
  const length = upper.length;

  interface Piece {
    word: string;
    unknown: boolean;
  }
  interface Best {
    score: number;
    pieces: Piece[];
  }

  const best: Best[] = new Array(length + 1);
  best[length] = { score: 0, pieces: [] };

  for (let at = length - 1; at >= 0; at -= 1) {
    const options: Array<{ word: string; score: number; unknown: boolean }> = [];

    // A number is its own word: POCKETLADDER1 -> Pocket Ladder 1.
    const digits = /^\d+/.exec(upper.slice(at));
    if (digits?.[0]) {
      options.push({ word: digits[0], score: digits[0].length ** 2, unknown: false });
    }
    for (const word of DICTIONARY) {
      if (word.length >= MIN_SPLIT && upper.startsWith(word, at)) {
        options.push({ word, score: word.length ** 2, unknown: false });
      }
    }
    // Always available: give up on this character. Keeps the segmentation total.
    options.push({ word: upper[at] as string, score: -1, unknown: true });

    let winner: Best | null = null;
    for (const option of options) {
      const rest = best[at + option.word.length];
      if (!rest) continue;
      const score = option.score + rest.score;
      if (!winner || score > winner.score) {
        winner = { score, pieces: [{ word: option.word, unknown: option.unknown }, ...rest.pieces] };
      }
    }
    best[at] = winner ?? { score: 0, pieces: [] };
  }

  // Characters nobody claimed are one word between their neighbours, not one word each.
  const out: string[] = [];
  let unknown = '';
  for (const piece of best[0]?.pieces ?? []) {
    if (piece.unknown) {
      unknown += piece.word;
      continue;
    }
    if (unknown) {
      out.push(unknown);
      unknown = '';
    }
    out.push(piece.word);
  }
  if (unknown) out.push(unknown);
  return out;
}

function titleCase(word: string, index: number): string {
  const upper = word.toUpperCase();
  if (ACRONYMS.has(upper)) return upper;
  const lower = word.toLowerCase();
  if (index > 0 && MINOR.has(lower)) return lower;
  if (/^\d+$/.test(word)) return word;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * A localisation key as a name. Anything that is not a key — already-readable text such as the
 * `levels` labels, which come through as `Lucent` — survives untouched.
 */
export function prettify(key: string | null | undefined): string {
  if (!key) return '';

  const core = stripAffixes(key);
  const pinned = OVERRIDES[core.toUpperCase()];
  if (pinned) return pinned;

  const words = core
    // underscores first, then camelCase inside each piece: Armor_BasicArmor_Name is both at once.
    .split('_')
    .flatMap((piece) => piece.replace(/([a-z\d])([A-Z])/g, '$1 $2').split(' '))
    .filter(Boolean)
    .flatMap((piece) => (DICTIONARY.includes(piece.toUpperCase()) ? [piece] : splitCompound(piece)));

  return words.map(titleCase).join(' ');
}
