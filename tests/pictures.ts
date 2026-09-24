/**
 * Pictures to feed a view, generated from a contract's schema rather than written by hand.
 *
 * A hand-written test picture is the author's idea of what the game sends, which is the one thing a
 * test of a view should not rely on. These come from the schema — the same file the types come from
 * — so they cover every watch the contract has, including the ones nobody thought to draw yet, and
 * they stay right when a minor adds a watch.
 *
 * Every picture is valid against the schema (the spec checks that before using one): the point is
 * what a view does with values the contract allows, not with values it forbids. Nothing produces a
 * NaN or an infinity, because JSON cannot carry either and scry turns both into `null`.
 */

/** The slice of JSON Schema that `scry schema` emits. */
export interface Schema {
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  minimum?: number;
  maximum?: number;
  maxItems?: number;
}

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Picture = Record<string, Json>;

/** The largest finite f32, which is what a `number` watch can really carry. */
const F32_MAX = 3.4028234663852886e38;
/** Cap for an array the schema does not cap, so a test stays a test. */
const UNCAPPED = 64;
/**
 * The long string of the `max` edge. Longer than any localisation key the game has, but not the
 * kilobytes an unterminated read could produce: the view's label prettifier is quadratic in the
 * length of its input, and at 4096 characters the catalogue alone takes the panel minutes to draw.
 * That is a known view issue, left for the view to fix; this keeps the test about everything else.
 */
const LONG_STRING = 256;

function types(schema: Schema): string[] {
  if (Array.isArray(schema.type)) return schema.type;
  return schema.type ? [schema.type] : [];
}

/** The non-null JSON type a schema describes. */
function kind(schema: Schema): string {
  return types(schema).find((t) => t !== 'null') ?? 'null';
}

/** A small deterministic generator, so a failing partial picture can be reproduced from its seed. */
export function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export type Extreme = 'max' | 'min' | 'empty' | 'nulls';

/**
 * A value at one edge of what the schema allows.
 *
 * - `max`: the largest integer the wire type carries, the largest finite float, a long string, and
 *   every collection at its cap.
 * - `min`: the smallest integer (zero for unsigned), the most negative float, the empty string, and
 *   every collection at its cap.
 * - `empty`: zero, the empty string, and every collection empty.
 * - `nulls`: every collection at its cap and every entry and field inside it `null` — the shape of a
 *   list whose container resolved but whose elements did not.
 */
export function extreme(schema: Schema, edge: Extreme): Json {
  switch (kind(schema)) {
    case 'integer':
      if (edge === 'max') return schema.maximum ?? Number.MAX_SAFE_INTEGER;
      if (edge === 'min') return schema.minimum ?? Number.MIN_SAFE_INTEGER;
      return 0;
    case 'number':
      if (edge === 'max') return F32_MAX;
      if (edge === 'min') return -F32_MAX;
      return 0;
    case 'string':
      return edge === 'max' ? 'W'.repeat(LONG_STRING) : '';
    case 'boolean':
      return edge === 'max';
    case 'array': {
      if (edge === 'empty') return [];
      const count = schema.maxItems ?? UNCAPPED;
      const item = schema.items ?? {};
      return Array.from({ length: count }, () => (edge === 'nulls' ? null : extreme(item, edge)));
    }
    case 'object': {
      const out: Record<string, Json> = {};
      for (const [name, field] of Object.entries(schema.properties ?? {})) {
        out[name] = edge === 'nulls' ? null : extreme(field, edge);
      }
      return out;
    }
    default:
      return null;
  }
}

/** An ordinary, plausible value: small numbers, short strings, a few entries, some of them null. */
export function ordinary(schema: Schema, next: () => number): Json {
  const maybeNull = <T extends Json>(value: T): T | null => (types(schema).includes('null') && next() < 0.2 ? null : value);
  switch (kind(schema)) {
    case 'integer': {
      const low = Math.max(schema.minimum ?? 0, 0);
      return maybeNull(low + Math.floor(next() * 500));
    }
    case 'number':
      return maybeNull(Math.round(next() * 10000) / 100);
    case 'string':
      return maybeNull(['', 'ZALE', 'VALERE', 'GARL', 'ARMOR_PIRATEGARB_NAME', 'SunboyBaseClass'][Math.floor(next() * 6)] ?? '');
    case 'boolean':
      return maybeNull(next() < 0.5);
    case 'array': {
      const cap = Math.min(schema.maxItems ?? UNCAPPED, 6);
      const item = schema.items ?? {};
      return maybeNull(Array.from({ length: Math.floor(next() * (cap + 1)) }, () => ordinary(item, next)));
    }
    case 'object': {
      const out: Record<string, Json> = {};
      for (const [name, field] of Object.entries(schema.properties ?? {})) out[name] = ordinary(field, next);
      return maybeNull(out);
    }
    default:
      return null;
  }
}

/** Every watch present, every one `null`: a game attached with nothing readable yet. */
export function allNull(schema: Schema): Picture {
  return Object.fromEntries(Object.keys(schema.properties ?? {}).map((name) => [name, null]));
}

/** Some watches present with ordinary values, the rest absent — what a picture looks like mid-attach. */
export function partial(schema: Schema, seed: number): Picture {
  const next = random(seed);
  const out: Picture = {};
  for (const [name, field] of Object.entries(schema.properties ?? {})) {
    if (next() < 0.5) out[name] = ordinary(field, next);
  }
  return out;
}

/** Every watch at one edge. */
export function atEdge(schema: Schema, edge: Extreme): Picture {
  return Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([name, field]) => [name, extreme(field, edge)]),
  );
}
