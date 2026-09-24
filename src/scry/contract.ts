/**
 * The whole surface between Ratatoskr and a telemetry view.
 *
 * The app calls exactly one function on the page — `window.scry.onFrame(kind, body)` — and there is
 * no way to call back: no `addJavascriptInterface`, no network, no storage. Anything this view knows,
 * it learned from a frame.
 *
 * See examples/telemetry-views/example.html in the Ratatoskr repo for the contract in prose.
 */

export type FrameKind = 'snapshot' | 'diff' | 'detached';

/** A watch's value. Anything JSON can carry; `null` means the watch went unreadable. */
export type Value = unknown;

/** Every watch the profile declares, by name. */
export type Values = Record<string, Value>;

/**
 * The complete picture. Sent when the stream opens, when a game attaches, after a gap, and then
 * every few seconds forever — most of them say exactly what the view already had. Handing it to Vue
 * as state is all the handling the repetition needs: an identical snapshot renders nothing.
 */
export interface Snapshot {
  attached: boolean;
  /** The game as Vibepollo knows it. Absent when the host has no name for it. */
  slug?: string | null;
  process?: string | null;
  /** The scry profile's label — also the key this very file is installed under. */
  profile?: string | null;
  contract?: number | null;
  values?: Values;
}

/** Only the watches that changed this tick. A key being present *is* the news. */
export type Diff = Values;

export interface ScryBridge {
  onFrame(kind: FrameKind, body: Snapshot | Diff | Record<string, never>): void;
}

declare global {
  interface Window {
    scry?: ScryBridge;
  }
}
