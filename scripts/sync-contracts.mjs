/**
 * Vendor the contracts this repository's views are built against, from a scry-profiles checkout.
 *
 *   npm run sync-contracts                        # from ../scry-profiles
 *   npm run sync-contracts -- /path/to/scry-profiles
 *
 * A view declares a contract id and a range; this copies every version of every contract a view
 * names — the schemas and the captured fixtures — into contracts/ and fixtures/, and records in
 * contracts.lock.json which commit of scry-profiles they came from and what each file hashed to.
 *
 * This is a stopgap for there being no published scry-profiles yet. Once it is published it becomes
 * a pinned dependency (a git dependency at a tag, or an npm package), the lock file is the package
 * manager's, and this script goes. Until then, `npm run sync-contracts -- --check` is what CI runs:
 * it fails if anything under contracts/ or fixtures/ no longer matches the lock.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadViews } from './views.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = join(root, 'contracts.lock.json');
const VENDORED = ['contracts', 'fixtures'];

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

/** Every vendored file, as `{ "contracts/sea-of-stars/2.0.schema.json": "<sha256>" }`. */
function hashes() {
  const out = {};
  for (const top of VENDORED) {
    for (const file of walk(join(root, top))) out[relative(root, file)] = sha256(file);
  }
  return out;
}

const args = process.argv.slice(2);

if (args[0] === '--check') {
  if (!existsSync(LOCK)) {
    console.error('contracts.lock.json is missing: run npm run sync-contracts');
    process.exit(1);
  }
  const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
  const now = hashes();
  const problems = [];
  for (const [file, hash] of Object.entries(lock.files)) {
    if (!(file in now)) problems.push(`${file}: in the lock, missing on disk`);
    else if (now[file] !== hash) problems.push(`${file}: changed since it was synced`);
  }
  for (const file of Object.keys(now)) {
    if (!(file in lock.files)) problems.push(`${file}: on disk, not in the lock`);
  }
  for (const p of problems) console.error(p);
  if (problems.length) {
    console.error('vendored contracts do not match contracts.lock.json; re-run npm run sync-contracts');
    process.exit(1);
  }
  console.log(`contracts match the lock (scry-profiles ${lock.source.commit.slice(0, 12)})`);
  process.exit(0);
}

const source = resolve(root, args[0] ?? '../scry-profiles');
if (!existsSync(join(source, 'contracts'))) {
  console.error(`${source} does not look like a scry-profiles checkout (no contracts/)`);
  process.exit(1);
}

const git = (...a) => execFileSync('git', ['-C', source, ...a], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
// A dirty checkout is not a version anyone else can reproduce, so it is not something to lock.
if (git('status', '--porcelain', '--', 'contracts', 'fixtures')) {
  console.error(`${source} has uncommitted changes under contracts/ or fixtures/; commit them first`);
  process.exit(1);
}

const ids = [...new Set(loadViews(root).map((view) => view.contract.id))].sort();
for (const top of VENDORED) rmSync(join(root, top), { recursive: true, force: true });
for (const id of ids) {
  for (const top of VENDORED) {
    const from = join(source, top, id);
    if (!existsSync(from)) {
      if (top === 'contracts') {
        console.error(`scry-profiles has no contracts/${id}/, which a view here declares`);
        process.exit(1);
      }
      continue;
    }
    mkdirSync(join(root, top), { recursive: true });
    cpSync(from, join(root, top, id), { recursive: true });
  }
}

const lock = {
  source: { repository: 'scry-profiles', path: relative(root, source) || '.', commit },
  contracts: ids,
  files: hashes(),
};
writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`synced ${ids.join(', ')} from scry-profiles ${commit.slice(0, 12)}`);
