# Telemetry views

A telemetry view is the page Ratatoskr draws on the companion panel while a game is streaming. This
directory builds them.

Right now there is one: the Sea of Stars profile from
[scry](https://github.com/DanieleS/scry)'s `examples/seaofstars`.

## What a view is allowed to be

The panel loads a view with `loadDataWithBaseURL(null, …)`, which gives it an **opaque origin**: no
network, no file access, no storage, no way to call back into the app. Frames go in through one
function and nothing comes out. The contract is documented in prose in
[`../examples/telemetry-views/example.html`](../examples/telemetry-views/example.html) and typed in
[`src/scry/contract.ts`](src/scry/contract.ts):

```js
window.scry.onFrame('snapshot' | 'diff' | 'detached', body)
```

Two consequences shape everything here:

- **One file.** CSS, JS and the font are inlined by the build; nothing is fetched. That is why this is
  a Vite project with `vite-plugin-singlefile` rather than a hand-written page.
- **No input from the pad.** The presentation window sets `FLAG_NOT_FOCUSABLE`, so the gamepad stays
  with the game. It is *not* `FLAG_NOT_TOUCHABLE`, so **touch works** — the tabs in this view are
  tapped. Anything driven by the pad would need a new frame kind on the app side.

## Build and install

```sh
npm install
npm run dev        # localhost:5173, with a real capture replaying through the real contract
npm run build      # -> dist/<profile>@<contract>.html
npm run push       # build, then adb push onto the device
```

The output filename is not chosen by hand. The app finds a view by sanitising the **profile name the
host reported** and opening `<sanitised>@<contract>.html`, so [`scripts/name.mjs`](scripts/name.mjs)
derives it from `fixtures/seaofstars.gen.json` using the same rule as
`TelemetryViewStore.LocalFolder#sanitise`. For this profile that is:

```
Sea of Stars _Steam_ _ world_ party_ gear_ derived@2.html
```

`npm run push` writes it to `/sdcard/Android/data/dev.kylobyte.ratatoskr.debug/files/telemetry-views/`.
Override the package with `PACKAGE=…`, and pin the device with `ANDROID_SERIAL=…` when the Thor shows
up twice under wireless debugging. Nothing hot-reloads on the device: re-push, then restart the stream.

## Developing without a device

`npm run dev` loads [`src/dev/replay.ts`](src/dev/replay.ts), which drives `window.scry.onFrame` with
`fixtures/seaofstars.extracted.json` — a real `scry watch` capture. The capture is a single tick, so
everything after the first snapshot (damage, a fight starting, combo points filling) is invented by
the harness; it also frames the page as a square, since the panel is roughly square and a browser
window is not. The harness is behind `import.meta.env.DEV` and is not in the built file at all.

Keys: `1` title screen · `2` voyage · `3` battle · `d`/`h` hurt/heal Zale · `r` resync snapshot ·
`x` detach · `s` stop the script · `p` restart it.

## How it is put together

| | |
|---|---|
| `src/scry/` | the contract, and the frame stream as reactive state |
| `src/domain/` | the 43 watches read as a game: party, world, inventory, scene selection |
| `src/components/` | the panel itself |
| `fixtures/` | the profile (`gen`), its authoring input (`map`, scry's), and a capture |

Three things in here are less obvious than they look:

- **Snapshots are adopted, not applied.** The app resends the whole picture every few seconds as a
  resync. `store.ts` writes only the keys whose value actually differs, so the repeat mutates nothing
  and renders nothing.
- **Animations are keyed on a change counter, never on a render.** `pulses[watch]` goes up whenever
  the host reports a watch moved — including when it moved back — and the flashing element is
  `:key`ed to it. Keying off a render would fire on every resync.
- **Sizing is one number.** Everything is in `rem` and `main.ts` sets the root font size from the
  panel's short side, so the view scales as a piece to whatever the second screen is. No breakpoints.

## Where the data stops being exact

Worth knowing before trusting a number on the panel:

- **Item names are guessed.** The game stores localisation *keys* (`ARMOR_PIRATEGARB_NAME`), not text,
  and this profile does not read the string table. `domain/labels.ts` strips the affixes, splits on
  underscores and camelCase, and segments what is left against a word list harvested from the game's
  own 439-entry catalogue. It gets all 155 level names and all but a handful of items right. **When a
  real name mapping (CSV) turns up, it becomes a generated `OVERRIDES` table and the word list stays
  only as the fallback.**
- **Stat ids are inferred.** Trinkets and upgrades report `{ stat: 3, amount: 4 }`. The mapping in
  `domain/stats.ts` (0 HP, 1 SP, 3 ATK, 4 DEF, 5 M.ATK, 6 M.DEF) is deduced from equipment whose
  effect is known — the Power Belt's +4 attack, the Green Leaf's +15 HP. Id 2 has never been observed
  and renders as `Stat 2`.
- **Combo points look like thousandths.** One snapshot read 3000 against a max of 3. The view scales
  only when the counter overshoots its own maximum, so a plain count still works if that is wrong.
- **The `roster_*` watches are not about the party.** `roster_hp_total` sums `hp` over the whole
  `characters` collection — all nine entries, including characters who have not joined and two 280 HP
  entries that look like scripted fights — so it reads **1086** for a party of three carrying **239**
  between them. `roster_downed` counts the same nine. The panel totals the party itself and labels the
  roster figure as the roster.
- **Max HP exists for three characters.** The profile derives `zale/valere/garl_max_hp`. A later party
  member gets a number with no bar rather than a bar against an invented maximum — a profile gap, not
  a view one.
- **M.ATK and M.DEF are computed here**, as base plus the equipped piece, because the profile derives
  only their physical counterparts.
- **There is no gold watch.** The counter in the header shows unspent XP and will switch to gold on
  its own the day `gold` starts arriving.
