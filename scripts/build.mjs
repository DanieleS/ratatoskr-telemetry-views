/**
 * Build every view, name each one by what it reads, and index them.
 *
 *   npm run build   ->  dist/<contract-id>@<from>-<below>.html  +  dist/index.json
 *
 * A built view is named by its contract id and range — `sea-of-stars@2.0-3.0.html` is the view that
 * reads sea-of-stars from 2.0 up to, not including, 3.0 — and never by a profile's label, which is
 * descriptive and may change without anything else changing. There is no unversioned copy: a view
 * that could be loaded without its contract being checked is exactly the silent failure the range
 * exists to prevent.
 *
 * index.json is what a client looks a view up in: for the contract a stream announces, the entry
 * whose range includes that version, and the hash to check the downloaded file against.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { loadViews, outputName, versionsFor } from './views.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const entries = [];
const taken = new Map();
for (const view of loadViews(root)) {
  // Fails the build when the range matches no vendored contract version: such a view has never been
  // type-checked or tested against anything.
  const versions = versionsFor(root, view);
  const file = outputName(view);
  if (taken.has(file)) {
    throw new Error(`views/${view.name} and views/${taken.get(file)} both build to ${file}`);
  }
  taken.set(file, view.name);

  process.env.VIEW = view.name;
  await build({ configFile: join(root, 'vite.config.ts'), logLevel: 'warn' });
  const built = join(dist, '.build', view.name, 'index.html');
  if (!existsSync(built)) throw new Error(`vite produced no index.html for views/${view.name}`);
  renameSync(built, join(dist, file));

  const sha256 = createHash('sha256').update(readFileSync(join(dist, file))).digest('hex');
  entries.push({
    view: view.name,
    contract: view.contract.id,
    range: view.contract.range.text,
    file,
    sha256,
    // The vendored versions the range covered at build time: what `npm test` and the type-check
    // matrix run this view against.
    covers: versions.map((v) => v.text),
  });
  console.log(`  view    ${file}  (${view.contract.id} ${view.contract.range.text}; covers ${versions.map((v) => v.text).join(', ')})`);
}
rmSync(join(dist, '.build'), { recursive: true, force: true });

const lock = JSON.parse(readFileSync(join(root, 'contracts.lock.json'), 'utf8'));
const index = { format: 1, contracts: { 'scry-profiles': lock.source.commit }, views: entries };
writeFileSync(join(dist, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`  index   dist/index.json (${entries.length} view${entries.length === 1 ? '' : 's'})`);
