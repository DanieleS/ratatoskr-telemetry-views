/**
 * The views in this repository and the contract versions each one has to work with.
 *
 * A view is a directory under views/ with a manifest.json naming the contract it draws and the range
 * of versions it reads: `{ "contract": { "id": "sea-of-stars", "range": "^2.0" } }`. Everything that
 * builds, type-checks or tests a view asks this module which versions that range covers, so "every
 * version in the range" means the same thing everywhere.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseRange, parseVersion, satisfies, rangeSlug } from '../src/scry/range.ts';

export function loadViews(root) {
  const base = join(root, 'views');
  return readdirSync(base)
    .filter((name) => statSync(join(base, name)).isDirectory())
    .sort()
    .map((name) => {
      const file = join(base, name, 'manifest.json');
      if (!existsSync(file)) throw new Error(`views/${name}/ has no manifest.json`);
      const manifest = JSON.parse(readFileSync(file, 'utf8'));
      const id = manifest.contract?.id;
      const range = parseRange(manifest.contract?.range ?? '');
      if (typeof id !== 'string' || !id) throw new Error(`views/${name}/manifest.json: contract.id is missing`);
      if (!range) {
        throw new Error(`views/${name}/manifest.json: contract.range must be a caret range like "^2.0"`);
      }
      return { name, dir: join(base, name), title: manifest.title ?? name, contract: { id, range } };
    });
}

/** The vendored versions of `id`, oldest first, as `{ text, version, schemaFile }`. */
export function contractVersions(root, id) {
  const dir = join(root, 'contracts', id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => /^(\d+\.\d+)\.schema\.json$/.exec(name)?.[1])
    .filter(Boolean)
    .map((text) => ({ text, version: parseVersion(text), schemaFile: join(dir, `${text}.schema.json`) }))
    .sort((a, b) => a.version.major - b.version.major || a.version.minor - b.version.minor);
}

/**
 * The versions a view has to be checked against: every vendored version inside its range. An empty
 * list is an error, not a pass — a range that matches nothing would otherwise test nothing.
 */
export function versionsFor(root, view) {
  const versions = contractVersions(root, view.contract.id).filter((v) => satisfies(view.contract.range, v.version));
  if (versions.length === 0) {
    throw new Error(
      `views/${view.name}: no vendored ${view.contract.id} version satisfies ${view.contract.range.text}; ` +
        'run npm run sync-contracts',
    );
  }
  return versions;
}

/** The file a built view is published as: named by what it reads, never by a profile label. */
export function outputName(view) {
  return `${view.contract.id}@${rangeSlug(view.contract.range)}.html`;
}
