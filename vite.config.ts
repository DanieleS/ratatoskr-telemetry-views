import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * A telemetry view is loaded with no origin: no network, no file access, no storage. Everything it
 * draws has to already be inside the file, so the build has one job beyond compiling Vue — emit a
 * single HTML with the CSS, the JS and the font inlined, and nothing left to fetch.
 *
 * One view at a time: `VIEW` names the directory under views/ (the only one, by default).
 * scripts/build.mjs runs this once per view and names the results; `npm run dev` serves one.
 */
const view = process.env.VIEW ?? 'sea-of-stars';

export default defineConfig({
  root: resolve(__dirname, 'views', view),
  plugins: [vue(), viteSingleFile()],
  server: {
    // The dev harness replays a fixture from the repository's fixtures/, outside the view's root.
    fs: { allow: [__dirname] },
  },
  build: {
    outDir: resolve(__dirname, 'dist', '.build', view),
    emptyOutDir: true,
    // The Thor runs a current Android WebView; no reason to ship transpiled-to-oblivion output.
    target: 'chrome90',
    cssCodeSplit: false,
    // Nothing may stay a separate request, so every asset is inlined regardless of size. The only
    // binary here is a 12 KB font subset; anything much larger belongs outside a view.
    assetsInlineLimit: 4 * 1024 * 1024,
    // A view is read by hand when it misbehaves, and there is no source map to load alongside it.
    minify: 'esbuild',
    reportCompressedSize: false,
  },
});
