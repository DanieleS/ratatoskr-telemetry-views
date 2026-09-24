/**
 * Boot.
 *
 * Two jobs before Vue: hand the page to the app, and decide how big a rem is.
 *
 * The second one is the whole responsive strategy. Every size in this view is in rem, and the root
 * font size is derived from the panel's short side, so the layout scales as one piece to whatever the
 * second screen happens to be — no breakpoints, and nothing to re-tune when the panel is a different
 * shape than the one it was drawn against.
 */
import { createApp } from 'vue';
import App from './App.vue';
import './styles/theme.css';
import { stream } from './stream';

/**
 * The design is drawn against a box this many rem on its short side.
 *
 * Measured against the panel it is for: the Thor's second screen is 1240x1080 physical at density
 * 369, so the WebView gets roughly 538x444 CSS px. 38 puts the root font just under 12px there, which
 * is as small as this typeface stays comfortable — 45 hit the clamp floor and left the labels at 6px.
 */
const DESIGN_REM = 38;

const host = document.getElementById('view') as HTMLElement;

function fit() {
  const box = host.getBoundingClientRect();
  const short = Math.min(box.width || window.innerWidth, box.height || window.innerHeight);
  // Clamped at both ends: a tiny panel stays legible, a large one does not turn into billboard text.
  const size = Math.min(30, Math.max(10, short / DESIGN_REM));
  document.documentElement.style.fontSize = `${size}px`;
}

fit();
new ResizeObserver(fit).observe(host);

// Installed before mounting so the first frame cannot arrive at a page with no `window.scry` on it.
// In practice the app waits for onPageFinished, but the ordering costs nothing to get right.
stream.install();

createApp(App).mount(host);

// The dev harness replays a real capture in the browser. Behind import.meta.env.DEV so it is not in
// the built file at all — a view that could invent its own telemetry is a view that can lie.
if (import.meta.env.DEV) {
  void import('./dev/replay');
}
