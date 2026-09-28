/**
 * Boot.
 *
 * Two jobs before Vue: hand the page to the app, and decide how big a rem is.
 *
 * Every size in this view is in rem, and the root font size is derived from the panel's short side,
 * so the layout scales as one piece to whatever the second screen happens to be. The design is drawn
 * against the Thor's second screen: 1240x1080 physical at density 369, roughly 538x444 CSS px, a
 * little wider than tall. It still works squarer or narrower, since it scales from the short side.
 */
import { createApp } from 'vue';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow-semi-condensed/latin-500.css';
import App from './App.vue';
import './styles/theme.css';
import { stream } from './stream';

/**
 * The design is drawn against a box this many rem on its short side. 37 puts the root font at about
 * 12px on the Thor, which keeps the smallest labels (0.8rem) just under 10px: small, but they are
 * the uppercase captions, and everything read at a glance is two to three times that.
 */
const DESIGN_REM = 37;

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
stream.install();

createApp(App).mount(host);

// The dev harness replays a real capture in the browser. Behind import.meta.env.DEV so it is not in
// the built file at all: a view that could invent its own telemetry is a view that can lie.
if (import.meta.env.DEV) {
  void import('./dev/replay');
}
