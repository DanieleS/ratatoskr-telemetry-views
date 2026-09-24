/**
 * Type-check every view against every contract version its range covers.
 *
 *   npm run typecheck
 *
 * A view declaring `^2.0` promises it reads 2.1 as well. Checking it only against the version it
 * was written with would leave that a promise; this runs vue-tsc once per covered version, with the
 * view's `@contracts/<id>` alias pointed at that version's generated types, so a view that stopped
 * compiling against a later minor fails here and not on a device.
 *
 * Every other contract alias stays where tsconfig.json puts it, so each run varies one thing.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadViews, versionsFor } from './views.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = join(root, '.typecheck');
rmSync(scratch, { recursive: true, force: true });
mkdirSync(scratch);

const runs = [];
for (const view of loadViews(root)) {
  for (const version of versionsFor(root, view)) runs.push({ view, version });
}

// De-duplicated by contract version: two views of the same contract share one run per version.
const seen = new Set();
let failed = 0;
for (const { view, version } of runs) {
  const key = `${view.contract.id}@${version.text}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const config = join(scratch, `tsconfig.${key}.json`);
  writeFileSync(
    config,
    JSON.stringify(
      {
        extends: '../tsconfig.json',
        compilerOptions: {
          paths: {
            [`@contracts/${view.contract.id}`]: [`../src/contracts/${view.contract.id}/${version.text}.ts`],
            '@contracts/*': ['../src/contracts/*/index.ts'],
          },
        },
      },
      null,
      2,
    ),
  );
  process.stdout.write(`vue-tsc  ${key.padEnd(24)} `);
  try {
    execFileSync(join(root, 'node_modules', '.bin', 'vue-tsc'), ['--noEmit', '-p', config], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log('ok');
  } catch (e) {
    console.log('FAIL');
    process.stdout.write(e.stdout?.toString() ?? '');
    process.stderr.write(e.stderr?.toString() ?? '');
    failed++;
  }
}
rmSync(scratch, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
