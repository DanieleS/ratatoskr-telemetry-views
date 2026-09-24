/**
 * The whole surface between Ratatoskr and a telemetry view.
 *
 * The app calls exactly one function on the page — `window.scry.onFrame(kind, body)` — and there is
 * no way to call back: no `addJavascriptInterface`, no network, no storage. Anything this view knows,
 * it learned from a frame.
 *
 * What the *values* look like is not described here. That is the contract's business: its schema
 * lives in scry-profiles, is vendored into contracts/, and becomes the generated `Values` type under
 * src/contracts/. This file describes only the envelope the values travel in.
 */

export type FrameKind = 'snapshot' | 'diff' | 'detached';

/**
 * Which contract the values follow, as scry announced it on `attached` and Vibepollo forwarded it.
 * `version` is `"<major>.<minor>"`.
 */
export interface ContractIdentity {
  id: string;
  version: string;
}

/**
 * The complete picture. Sent when the stream opens, when a game attaches, after a gap, and then
 * every few seconds forever — most of them say exactly what the view already had.
 *
 * `V` is the contract's generated `Values` type. Every key is optional: a watch the host never read
 * is simply absent, and one that went unreadable is `null`.
 */
export interface Snapshot<V> {
  attached: boolean;
  /** The game as Vibepollo knows it. Absent when the host has no name for it. */
  slug?: string | null;
  process?: string | null;
  /** The scry profile's label. Descriptive only: nothing is looked up by it. */
  profile?: string | null;
  /** Absent when the profile declares no contract, or the host predates contracts. */
  contract?: ContractIdentity | null;
  values?: Partial<V>;
}

/** Only the watches that changed this tick. A key being present *is* the news. */
export type Diff<V> = Partial<V>;

/**
 * What the app actually calls. The body is typed `unknown` on purpose: it is JSON from another
 * process, and the stream is the one place that decides how far to trust it.
 */
export interface ScryBridge {
  onFrame(kind: FrameKind, body: unknown): void;
}

declare global {
  interface Window {
    scry?: ScryBridge;
  }
}
