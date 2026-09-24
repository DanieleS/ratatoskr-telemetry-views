/**
 * Give the built view the one filename the app will look for.
 *
 * Ratatoskr finds a view by the *profile* that produced the telemetry: it sanitises the profile
 * name the host reported and opens `<sanitised>@<contract>.html`, falling back to `<sanitised>.html`
 * (see TelemetryViewStore.LocalFolder). Getting that name right by hand is the easiest way to spend
 * an evening wondering why the panel still shows the performance stats, so it is derived here from
 * the profile itself — the same file scry hands the host.
 */
import { readFileSync, renameSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const profilePath = resolve(root, 'fixtures/seaofstars.gen.json');
const profile = JSON.parse(readFileSync(profilePath, 'utf8'));

/**
 * Mirror of TelemetryViewStore.LocalFolder#sanitise: letters, digits, dash, underscore and space
 * survive; everything else becomes an underscore. Java's Character.isLetterOrDigit is Unicode-aware,
 * hence the \p{L}\p{N} classes rather than a-z0-9.
 */
function sanitise(name) {
  let out = '';
  for (const ch of name) {
    out += /[\p{L}\p{N}\-_ ]/u.test(ch) ? ch : '_';
  }
  return out.trim();
}

const label = profile.label;
const contract = profile.contractVersion;
if (typeof label !== 'string' || !label) {
  throw new Error(`${profilePath} has no "label" — that is the key the view is found by.`);
}

// Pinned to the contract version the profile declares: a view is written against a shape of values,
// and a profile that changes that shape should not silently inherit the old view.
const filename = `${sanitise(label)}${contract != null ? `@${contract}` : ''}.html`;

const built = resolve(root, 'dist/index.html');
if (!existsSync(built)) {
  throw new Error('dist/index.html is missing — run the build first.');
}
renameSync(built, resolve(root, 'dist', filename));

/*
 * The same view again, unpinned — and it earns its place by closing a silent failure.
 *
 * The app only looks for `<name>@<contract>.html` when the snapshot carries a contract at all, and
 * that number originates in the profile but has to survive two hops to get here: scry reports
 * `contract_version` in its attach event (only since 0.1.0-alpha.2), and Vibepollo forwards it only
 * when present. Any older helper on the host, or a profile that declares no contractVersion, and the
 * lookup falls through to the plain name — which, with only the pinned file installed, does not
 * exist. The panel then quietly shows the performance stats and the log says "no view installed".
 */
const unpinned = `${sanitise(label)}.html`;
if (unpinned !== filename) {
  copyFileSync(resolve(root, 'dist', filename), resolve(root, 'dist', unpinned));
}

console.log(`\n  view    ${filename}`);
console.log(`  also    ${unpinned}  (used when the stream reports no contract)`);
console.log(`  profile ${label}`);
console.log(`  push    npm run push\n`);
