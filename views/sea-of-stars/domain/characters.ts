/**
 * What the view knows about a character that the telemetry does not carry.
 *
 * The stream gives ids (`ZALE`) and class ids (`SunboyBaseClass`) — enough to be correct, not enough
 * to look like Sea of Stars. The names and the two canon titles are written down here; everything
 * else falls back to the class id, so a character nobody anticipated still renders with a plausible
 * subtitle instead of a blank.
 */
import { prettify } from './labels';

export type Sigil = 'sun' | 'moon' | 'pot' | 'blade' | 'wind' | 'star' | 'gear' | 'stone' | 'core';

export interface CharacterMeta {
  name: string;
  /** Only where it is canon. Otherwise derived from the class id at call time. */
  title?: string;
  sigil: Sigil;
  /** Drives the character's accent throughout the panel: bar fill, name plate, sigil. */
  accent: string;
}

const ROSTER: Record<string, CharacterMeta> = {
  ZALE: { name: 'Zale', title: 'Solstice Warrior of the Sun', sigil: 'sun', accent: '#f4c14e' },
  VALERE: { name: 'Valere', title: 'Solstice Warrior of the Moon', sigil: 'moon', accent: '#a8d8f0' },
  GARL: { name: 'Garl', title: 'Warrior Cook', sigil: 'pot', accent: '#94c46b' },
  SERAI: { name: 'Serai', sigil: 'blade', accent: '#b79ae0' },
  RESHAN: { name: 'Reshan', sigil: 'wind', accent: '#7fd6c4' },
  BST: { name: "B'st", sigil: 'star', accent: '#ef9ad2' },
  ARTIFICER: { name: 'The Artificer', sigil: 'gear', accent: '#d3a878' },
  MASTER_MORAINE: { name: 'Master Moraine', sigil: 'stone', accent: '#a9b6c9' },
  PROTOTYPE_ZERO: { name: 'Prototype Zero', sigil: 'core', accent: '#e58269' },
};

const UNKNOWN: CharacterMeta = { name: '', sigil: 'star', accent: '#9fb4d4' };

export function characterMeta(id: string | null | undefined): CharacterMeta {
  if (!id) return UNKNOWN;
  const known = ROSTER[id.toUpperCase()];
  if (known) return known;
  // A character the profile knows and this file does not: the id is at least a name-shaped thing.
  return { ...UNKNOWN, name: prettify(id) };
}

/** The line under the name: canon where we have it, the class id where we do not. */
export function characterTitle(id: string | null | undefined, classId: string | null | undefined): string {
  const meta = characterMeta(id);
  if (meta.title) return meta.title;
  if (!classId) return '';
  return prettify(classId.replace(/BaseClass$/, ''));
}
