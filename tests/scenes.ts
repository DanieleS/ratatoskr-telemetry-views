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
  'sea-of-stars': (picture) => {
    // `party` holds at most eight ids; the roster may hold more.
    const party = idsOf(picture['characters']).slice(0, 8);
    return [
      { name: 'voyage', patch: { party, combat_party: party, in_combat: 0 }, taps: ['Equipment', 'Items', 'Party'] },
      { name: 'battle', patch: { party, combat_party: party, in_combat: 1 } },
    ];
  },
};
