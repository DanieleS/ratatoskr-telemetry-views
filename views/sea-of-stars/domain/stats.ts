/**
 * The numeric stat ids that trinket modifiers and upgrades are reported with.
 *
 * The profile reports `{ stat: 3, amount: 4 }` and nothing else, so the mapping is an inference from
 * the one snapshot we have — and it holds up: the Power Belt reports stat 3 (+4 attack), the Green
 * Leaf stat 0 (+15 HP), the Arcane Amulet stat 6 (+10 magic defence). `upgrade_step` names exactly
 * six stats, and the upgrade lists use exactly these six ids, with 2 never appearing.
 *
 * Anything unrecognised renders as "Stat n" rather than being guessed at.
 */
export const STAT_LABELS: Record<number, string> = {
  0: 'HP',
  1: 'SP',
  3: 'ATK',
  4: 'DEF',
  5: 'M.ATK',
  6: 'M.DEF',
};

export function statLabel(stat: number): string {
  return STAT_LABELS[stat] ?? `Stat ${stat}`;
}

/**
 * Modifier kinds, as the game names its classes. Only the plain additive one is common; the rest are
 * shown by their own name, tidied up, because inventing a description for a modifier we have never
 * seen fire would be worse than showing what it is called.
 */
export function modifierKind(kind: string | null | undefined): string {
  if (!kind) return '';
  if (kind === 'PlayerAddStatModifier') return 'flat';
  return kind
    .replace(/Modifier$/, '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .toLowerCase();
}
