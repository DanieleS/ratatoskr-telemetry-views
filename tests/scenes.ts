/**
 * How to steer each view into each of its screens, given a picture.
 *
 * A generated picture is valid but incoherent — its party names nobody in its roster — so without a
 * nudge a view would sit on its idle screen for every test and prove nothing about the others. These
 * patches are the nudge: they only rewire values the picture already has, and every patch keeps the
 * picture valid against the schema.
 */
import type { Picture } from './pictures';

export interface Step {
  name: string;
  patch: Picture;
  /** Tabs to tap through once the patch has landed, by their visible label. */
  taps?: string[];
}

type Steer = (picture: Picture) => Step[];

function idsOf(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) =>
    entry && typeof entry === 'object' && 'id' in entry && typeof entry.id === 'string' && entry.id ? [entry.id] : [],
  );
}

export const steer: Record<string, Steer> = {
  'ff7-rebirth': (picture) => {
    // `party` holds three indices into `characters`; only the ones the picture's table has can
    // name a member, and 16 is an empty slot.
    const count = Array.isArray(picture['characters']) ? picture['characters'].length : 0;
    const party = [0, 1, 2].map((slot) => (slot < count ? slot : 16));
    // Out of the title screen only once a member has a max HP; give the table's records one.
    const characters = Array.isArray(picture['characters'])
      ? picture['characters'].map((one) =>
          one && typeof one === 'object' && !Array.isArray(one) ? { ...one, hp_max: 1134 } : one,
        )
      : picture['characters'] ?? null;
    const steps: Step[] = [
      { name: 'field', patch: { characters, party, target_hp_pct: null, target_stagger_pct: null } },
      { name: 'battle', patch: { characters, party, target_hp_pct: 64, target_stagger_pct: 100 } },
      { name: 'paused', patch: { game_pause: 1, game_state: 8 } },
    ];
    return steps;
  },
  'sea-of-stars': (picture) => {
    // `party` holds at most eight ids; the roster may hold more.
    const party = idsOf(picture['characters']).slice(0, 8);
    return [
      { name: 'voyage', patch: { party, combat_party: party, in_combat: 0 }, taps: ['Equipment', 'Items', 'Party'] },
      { name: 'battle', patch: { party, combat_party: party, in_combat: 1 } },
    ];
  },
};
