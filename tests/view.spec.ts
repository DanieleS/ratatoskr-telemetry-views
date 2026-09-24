/**
 * Load each built view in a headless browser and feed it pictures it must survive.
 *
 * "Survive" is narrow and checkable: no uncaught exception, nothing on console.error (which is where
 * Vue reports a render that threw), and the page still answering within a few seconds after every
 * frame — a view stuck in a loop fails here rather than freezing a panel. What the view *draws* is
 * not asserted, beyond which screen it chose: that is for eyes, not for CI.
 *
 * Pictures come from the contract's schema (see pictures.ts): the real capture, an all-null one,
 * partial ones, and each edge of every type. Each is fed as a snapshot, then steered into each of
 * the view's screens, then replayed as a stream of per-watch diffs.
 */
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import type { Cell } from '../playwright.config';
import { allNull, atEdge, partial, type Extreme, type Picture, type Schema } from './pictures';
import { steer } from './scenes';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
/** How long one frame may take to settle before the view counts as hung. */
const DEADLINE_MS = 5_000;

function cellOf(info: TestInfo): Cell {
  const cell = info.project.metadata as Partial<Cell>;
  if (!cell.view || !cell.file || !cell.contract || !cell.version || !cell.schemaFile) {
    throw new Error(`project ${info.project.name} has no view metadata; run through playwright.config.ts`);
  }
  return { view: cell.view, file: cell.file, contract: cell.contract, version: cell.version, schemaFile: cell.schemaFile };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The `values` events of every capture of this contract's major, whatever minor it was filed under. */
function captures(cell: Cell): Array<{ name: string; values: Picture }> {
  const major = cell.version.split('.')[0];
  const base = join(root, 'fixtures', cell.contract);
  const out: Array<{ name: string; values: Picture }> = [];
  for (const version of readdirSync(base).filter((v) => v.split('.')[0] === major).sort()) {
    for (const file of readdirSync(join(base, version)).sort()) {
      const text = readFileSync(join(base, version, file), 'utf8');
      // Events one per line or pretty-printed back to back: split where one object closes and the
      // next opens, which is safe here because a capture's strings never contain `}\n{`.
      const events: unknown[] = text
        .trim()
        .split(/(?<=})\s*(?={)/)
        .map((chunk) => JSON.parse(chunk));
      events.forEach((event, at) => {
        if (isRecord(event) && event['event'] === 'values' && isRecord(event['values'])) {
          out.push({ name: `${version}/${file}#${at}`, values: event['values'] as Picture });
        }
      });
    }
  }
  return out;
}

async function open(page: Page, cell: Cell) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
  });
  await page.goto(pathToFileURL(join(root, 'dist', cell.file)).href);
  await settle(page);
  return problems;
}

/** Wait for the page to render a frame, failing if it cannot within the deadline. */
async function settle(page: Page) {
  const answered = page.evaluate(
    () => new Promise<boolean>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))),
  );
  const hung = new Promise<boolean>((done) => setTimeout(() => done(false), DEADLINE_MS));
  expect(await Promise.race([answered, hung]), `the view did not render a frame within ${DEADLINE_MS} ms`).toBe(true);
}

async function frame(page: Page, kind: 'snapshot' | 'diff' | 'detached', body: unknown) {
  // Serialised here and parsed in the page, like the app's evaluateJavascript does: nothing but JSON
  // crosses.
  const sent = page.evaluate(
    ([k, json]) => {
      if (!window.scry) throw new Error('window.scry is not installed');
      window.scry.onFrame(k as 'snapshot' | 'diff' | 'detached', JSON.parse(json));
    },
    [kind, JSON.stringify(body)] as const,
  );
  const hung = new Promise<'hung'>((done) => setTimeout(() => done('hung'), DEADLINE_MS));
  expect(await Promise.race([sent, hung]), `onFrame('${kind}') did not return within ${DEADLINE_MS} ms`).not.toBe('hung');
  await settle(page);
}

function snapshot(cell: Cell, values: Picture, contract: unknown = { id: cell.contract, version: cell.version }) {
  return { attached: true, slug: 'Test', process: 'Game.exe', profile: 'test profile', contract, values };
}

const state = (page: Page) => page.locator('.view').getAttribute('data-state');

/** Everything a picture is put through, in one page. */
async function exercise(page: Page, cell: Cell, values: Picture) {
  const problems = await open(page, cell);

  await frame(page, 'snapshot', snapshot(cell, values));
  expect(await state(page)).not.toBe('unsupported');

  for (const step of steer[cell.view]?.({ ...values }) ?? []) {
    await frame(page, 'diff', step.patch);
    for (const label of step.taps ?? []) {
      const tab = page.getByRole('button', { name: label, exact: true });
      if (await tab.count()) {
        await tab.first().click({ timeout: DEADLINE_MS });
        await settle(page);
      }
    }
  }

  // The same picture again as a stream of one-watch diffs, the way it arrives as a game moves.
  for (const [name, value] of Object.entries(values)) await frame(page, 'diff', { [name]: value });
  // The periodic resync, and a detach.
  await frame(page, 'snapshot', snapshot(cell, values));
  await frame(page, 'detached', {});

  expect(problems, problems.join('\n')).toEqual([]);
}

test.describe('the view survives', () => {
  let schema: Schema;
  let validate: (values: Picture) => void;

  test.beforeAll(async ({}, info) => {
    const cell = cellOf(info);
    const parsed: unknown = JSON.parse(readFileSync(cell.schemaFile, 'utf8'));
    if (!isRecord(parsed)) throw new Error(`${cell.schemaFile} is not a schema`);
    schema = parsed as Schema;
    const check = new Ajv2020({ strict: false, allErrors: true }).compile(parsed);
    // A picture the contract forbids would test the generator, not the view.
    validate = (values) => {
      if (!check(values)) throw new Error(`test picture is not valid ${cell.contract} ${cell.version}: ${JSON.stringify(check.errors)}`);
    };
  });

  test('the real captures', async ({ page }, info) => {
    const cell = cellOf(info);
    const all = captures(cell);
    expect(all.length, 'no capture of this major to replay').toBeGreaterThan(0);
    for (const capture of all) {
      await test.step(capture.name, () => exercise(page, cell, capture.values));
    }
  });

  test('an all-null picture', async ({ page }, info) => {
    const values = allNull(schema);
    validate(values);
    await exercise(page, cellOf(info), values);
  });

  for (const seed of [1, 2, 3, 4, 5, 6]) {
    test(`a partial picture (seed ${seed})`, async ({ page }, info) => {
      const values = partial(schema, seed);
      validate(values);
      await exercise(page, cellOf(info), values);
    });
  }

  for (const edge of ['max', 'min', 'empty', 'nulls'] satisfies Extreme[]) {
    test(`every value at its ${edge} edge`, async ({ page }, info) => {
      const values = atEdge(schema, edge);
      validate(values);
      await exercise(page, cellOf(info), values);
    });
  }
});

test.describe('the view refuses', () => {
  const cases: Array<[string, (cell: Cell) => unknown]> = [
    ['another contract', (cell) => ({ id: `not-${cell.contract}`, version: cell.version })],
    ['the next major', (cell) => ({ id: cell.contract, version: `${Number(cell.version.split('.')[0]) + 1}.0` })],
    ['a version below its range', (cell) => ({ id: cell.contract, version: `${Number(cell.version.split('.')[0]) - 1}.9` })],
    ['a malformed version', (cell) => ({ id: cell.contract, version: 'two' })],
    ['no contract at all', () => null],
    ['the deprecated integer', (cell) => Number(cell.version.split('.')[0])],
  ];

  for (const [name, contract] of cases) {
    test(name, async ({ page }, info) => {
      const cell = cellOf(info);
      const problems = await open(page, cell);
      const [capture] = captures(cell);
      await frame(page, 'snapshot', snapshot(cell, capture?.values ?? {}, contract(cell)));
      expect(await state(page)).toBe('unsupported');
      await expect(page.getByText('Unsupported contract')).toBeVisible();
      // Refused means not drawn: none of the values made it onto the screen, and a diff does not
      // sneak them in afterwards.
      await frame(page, 'diff', capture?.values ?? {});
      expect(await state(page)).toBe('unsupported');
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});
