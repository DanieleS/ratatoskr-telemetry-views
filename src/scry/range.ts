/**
 * Contract versions and the ranges a view declares, shared by the build (which names and indexes a
 * view by its range) and the view itself (which refuses to draw a version outside it).
 *
 * Only caret ranges exist: `^2.1` is every version from 2.1 up to, not including, 3.0. That is the
 * whole of the contract versioning rule — a minor only adds, so a view written against 2.1 reads any
 * later 2.x — and anything more expressive would be a way to claim compatibility the rule does not
 * give. The same holds below 1.0: `^0.3` is 0.3 up to 1.0, not semver's narrower reading, because a
 * contract's minor means the same thing at any major.
 *
 * Kept free of anything but erasable TypeScript so that Node can load it directly from the build
 * scripts; there is exactly one implementation of "is this version in range".
 */

export interface Version {
  major: number;
  minor: number;
}

export interface Range {
  /** As written in the manifest, e.g. `^2.0`. */
  text: string;
  /** The lowest version included. */
  min: Version;
  /** The first version *not* included: the next major. */
  below: Version;
}

export function parseVersion(text: unknown): Version | null {
  if (typeof text !== 'string') return null;
  const match = /^(\d+)\.(\d+)$/.exec(text);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function parseRange(text: string): Range | null {
  if (!text.startsWith('^')) return null;
  const min = parseVersion(text.slice(1));
  if (!min) return null;
  return { text, min, below: { major: min.major + 1, minor: 0 } };
}

function compare(a: Version, b: Version): number {
  return a.major - b.major || a.minor - b.minor;
}

export function satisfies(range: Range, version: Version): boolean {
  return compare(version, range.min) >= 0 && compare(version, range.below) < 0;
}

export function formatVersion(version: Version): string {
  return `${version.major}.${version.minor}`;
}

/** The range as a file-name-safe token: `^2.0` becomes `2.0-3.0`, i.e. from 2.0, up to 3.0. */
export function rangeSlug(range: Range): string {
  return `${formatVersion(range.min)}-${formatVersion(range.below)}`;
}
