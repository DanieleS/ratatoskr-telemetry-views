/**
 * The frame stream, as reactive state — for any view, over any contract.
 *
 * Three things here are worth more than they look:
 *
 * 1. A snapshot is *adopted*, not rebuilt from. Only the keys whose value actually differs get
 *    written, so the resync that arrives every few seconds mutates nothing and renders nothing. Vue
 *    would already skip the DOM work, but a wholesale reassign would still invalidate every computed
 *    that touches `values`, several times a minute, for no reason.
 *
 * 2. Pulses count *changes*, not renders. A diff naming a watch means the host saw that watch move,
 *    so the counter goes up even when the new value equals the old one — HP that went 100 -> 90 -> 100
 *    between two frames must still read as "something happened". Animations key off the counter;
 *    anything keyed off a render would fire on the resync too.
 *
 * 3. The contract is checked before a single value is kept. A view declares which contract it reads
 *    and which versions of it; a snapshot announcing anything else — another game, a later major, or
 *    no contract at all — leaves the view with no values and `meta.unsupported` saying why, so it
 *    draws a refusal instead of guessing at a shape it was not written for. The app is meant to
 *    never load a view for the wrong contract; this is the second lock on the same door.
 */
import { reactive, shallowReactive } from 'vue';
import type { ContractIdentity, FrameKind } from './contract';
import { parseRange, parseVersion, satisfies, type Range } from './range';

/** What a view reads, as its manifest declares it. */
export interface Accepts {
  id: string;
  /** A caret range, e.g. `^2.0`. */
  range: string;
}

export interface StreamMeta {
  /** Whether a game is attached right now. */
  attached: boolean;
  /** A game was attached and is now gone; what is on screen is history. */
  gone: boolean;
  slug: string | null;
  process: string | null;
  profile: string | null;
  /** The contract the host announced, whether or not this view reads it. */
  contract: ContractIdentity | null;
  /**
   * Why this view will not draw the attached game, or null when it will (or nothing is attached).
   * Set only while attached.
   */
  unsupported: string | null;
  /** Frames seen. Only useful to prove the stream is alive. */
  frames: number;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function identityOf(value: unknown): ContractIdentity | null {
  if (!isRecord(value)) return null;
  const { id, version } = value;
  return typeof id === 'string' && typeof version === 'string' ? { id, version } : null;
}

/**
 * Cheap structural comparison, good enough to decide whether a write is needed.
 *
 * Watch values are JSON, and the collections are small and in a stable order, so serialising both
 * sides costs less than the wasted invalidation it prevents.
 */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Create the stream for a view whose contract's values are `V` (its generated `Values` type).
 *
 * Throws on a malformed `accepts`: that is a bug in the view's manifest, and one the build would
 * have caught first.
 */
export function createStream<V extends object>(accepts: Accepts) {
  const parsed = parseRange(accepts.range);
  if (!parsed) throw new Error(`not a caret range: ${JSON.stringify(accepts.range)}`);
  const range: Range = parsed;

  // Values are replaced whole, never mutated in place, so shallow reactivity is exactly enough: a
  // computed that reads `values.characters` re-runs when the array is swapped for the next one.
  const raw = shallowReactive<Raw>({});
  const before = shallowReactive<Raw>({});
  const counts = reactive<Record<string, number>>({});

  const meta = reactive<StreamMeta>({
    attached: false,
    gone: false,
    slug: null,
    process: null,
    profile: null,
    contract: null,
    unsupported: null,
    frames: 0,
  });

  /** Identity of the game on screen, so a resync is told apart from a different game attaching. */
  let identity: string | null = null;

  function forget() {
    for (const key of Object.keys(raw)) delete raw[key];
    for (const key of Object.keys(counts)) delete counts[key];
    for (const key of Object.keys(before)) delete before[key];
  }

  function adopt(next: Raw) {
    for (const [key, value] of Object.entries(next)) {
      if (!same(raw[key], value)) raw[key] = value;
    }
    // A snapshot is the whole truth, so a key it does not mention is a watch that no longer exists.
    for (const key of Object.keys(raw)) {
      if (!(key in next)) {
        delete raw[key];
        delete counts[key];
        delete before[key];
      }
    }
  }

  /** Null when this view reads `announced`; otherwise the sentence the refusal screen shows. */
  function refusal(announced: ContractIdentity | null): string | null {
    const wanted = `${accepts.id} ${accepts.range}`;
    if (!announced) return `This stream does not say which contract its values follow. This view reads ${wanted}.`;
    const version = parseVersion(announced.version);
    if (announced.id !== accepts.id || !version || !satisfies(range, version)) {
      return `This stream follows ${announced.id} ${announced.version}. This view reads ${wanted}.`;
    }
    return null;
  }

  function onFrame(kind: FrameKind, body: unknown): void {
    meta.frames += 1;

    if (kind === 'snapshot') {
      const snapshot = isRecord(body) ? body : {};
      meta.gone = false;
      meta.attached = snapshot['attached'] === true;
      meta.contract = identityOf(snapshot['contract']);

      if (!meta.attached) {
        identity = null;
        forget();
        meta.slug = meta.process = meta.profile = null;
        meta.contract = null;
        meta.unsupported = null;
        return;
      }

      meta.slug = stringOrNull(snapshot['slug']);
      meta.process = stringOrNull(snapshot['process']);
      meta.profile = stringOrNull(snapshot['profile']);
      meta.unsupported = refusal(meta.contract);
      if (meta.unsupported) {
        identity = null;
        forget();
        return;
      }

      const contract = meta.contract ? `${meta.contract.id}@${meta.contract.version}` : '';
      const next = `${meta.profile ?? ''} ${meta.slug ?? ''} ${contract}`;
      if (next !== identity) {
        identity = next;
        // A different game earns a clean slate; the same game mid-resync keeps its pulses so an
        // animation in flight is not cut short.
        forget();
      }
      adopt(isRecord(snapshot['values']) ? snapshot['values'] : {});
      return;
    }

    if (kind === 'diff') {
      // Values for a contract this view does not read are not kept, not even for a moment.
      if (!meta.attached || meta.unsupported || !isRecord(body)) return;
      for (const [key, value] of Object.entries(body)) {
        before[key] = raw[key];
        raw[key] = value;
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return;
    }

    if (kind === 'detached') {
      identity = null;
      meta.attached = false;
      meta.gone = true;
      meta.unsupported = null;
    }
  }

  // Read-only to everyone but this module: a view that could write its own telemetry could lie.
  const publicMeta: Readonly<StreamMeta> = meta;

  return {
    /**
     * Every watch, by name, typed by the contract.
     *
     * This is the one place JSON from the host becomes a typed value, and it is an assertion, not a
     * check: the contract was verified above, and the schema is what the values were checked against
     * in scry-profiles. What the type does guarantee is the part that matters in a view — every
     * value may be `null` or missing, and the compiler will not let that be forgotten.
     */
    values: raw as Readonly<Partial<V>>,
    /** What each watch held immediately before its latest diff, so a change has a direction. */
    previous: before as Readonly<Partial<V>>,
    /** How many times each watch has been reported changed. Monotonic; use it as an animation key. */
    pulses: counts as Readonly<Partial<Record<keyof V, number>>>,
    meta: publicMeta,
    onFrame,
    /** Hand the page to the app. Nothing arrives before this runs. */
    install(): void {
      window.scry = { onFrame };
    },
  };
}
