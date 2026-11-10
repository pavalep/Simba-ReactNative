# SIMBA designs

The app's design documents, kept next to the app they describe.

| file | what it is |
|---|---|
| `Simba_UI_UX_Complete_Design.figcraft` | **the design document** — a real, editable design file (FigCraft format). Every screen lives here, one page per screen. |
| `Simba_UI_UX_Complete_Design.fig` | the same document exported in Figma's `.fig` format |
| `login-peak.png` | a headless render of page 1 (`Login`) at 411 × 914 (the device's dp size) |
| `login-rest.png` | a headless render of page 2 (`Login — orb at rest`) |
| `login-design-vs-app.png` | the design render next to the emulator screenshot, at the same scale |
| `build-login-design.js` | the generator — rebuilds the document **from the app's own sources** |
| `measure-lockup.js` | the ruler — measures the lockup inside the orb, on a render or a screenshot |

## The pages that exist today

| page | what it shows |
|---|---|
| `Login` | the login screen, with the orb at the **peak** of its pulse (scale 1.12, opacity 0.16) |
| `Login — orb at rest` | the same screen with the orb at **rest** (scale 1.00, opacity 0.08) |

The orb's two states are the two ends of ONE animated value in the app
(`LoginScreen.tsx:108-116`): `scale` and `opacity` are both interpolated from
`pulseAnim`. The design draws both ends so the pulse can be reviewed as a
design, not as a moving target.

## Why FigCraft

Figma is not available in this environment (no desktop app, no MCP server, no
token). FigCraft is a real design tool with a CLI, so the design is a real
document: it can be opened, edited, rendered and exported — and it can be
diffed against the app automatically.

## The generator is the source of truth

`build-login-design.js` reads the app, not a copy of the app:

- the frame is the device's dp size (411 × 914)
- the insets are the ones the device reported (24 / 24)
- the colours are the light-theme tokens in `src/theme/tokens.ts`
- the **lockup's type scale and its two optical gaps** are the styles in
  `src/screens/Login/components/LoginScreen.tsx` — the wordmark and the
  tagline are NOT plain typography tokens, the login screen sets them
  itself, so the design reads them where they live
- the family strings are `src/constants/fontFamily.ts`
- the artwork is `src/assets/svg/ui_lion.svg` and the four Google G paths in
  `src/components/core/GoogleSignInButton/GoogleSignInButton.tsx`

The layout mirrors the React Native tree 1:1 with auto-layout, so FigCraft
computes the geometry the way RN does — which is what makes the design render
comparable to a device screenshot, element by element.

## The lockup, and why it is measured

The lockup is the emblem (the lion), the name (the `Simba` script) and one
quiet supporting line (the tagline) — in that order of importance. The orb
behind them is a **circle**, so the space the content has narrows as it
descends: a tagline set as large as the wordmark both inverts the hierarchy
and pushes its descenders onto the arc.

So the lockup's fit is measured, not eyeballed. `measure-lockup.js` finds
every ink band inside the orb on a rendered PNG — a FigCraft render or a
device screenshot — and reports the bounding box and the true minimum
clearance from the ink to the arc.

As shipped (2026-11-09):

| band | ink box (dp) | min clearance to the arc |
|---|---|---|
| lion | y 263.5 … 362.3, x 162.5 … 243.3 | 61.0 dp |
| `Simba` | y 387.5 … 424.3, x 139.5 … 270.3 | 81.1 dp |
| tagline | y 453.5 … 476.3, x 116.5 … 294.3 | 30.9 dp |

The air above the lockup is 61.2 dp and below it 57.5 dp — a 3.7 dp
difference, so the group reads centred in the orb.

The device agrees with the design to within 1 dp on every element
(0.3 dp on the lion, 0.8 dp on the wordmark, 0.7 dp on the tagline).

## Rebuilding it

```sh
node designs/build-login-design.js intended light
figcraft-cli run designs/.build/login-intended-light.json --out designs/Simba_UI_UX_Complete_Design.figcraft
figcraft-cli render designs/Simba_UI_UX_Complete_Design.figcraft -o designs/login-peak.png --page "Login"
figcraft-cli render designs/Simba_UI_UX_Complete_Design.figcraft -o designs/login-rest.png --page "Login — orb at rest"
figcraft-cli export designs/Simba_UI_UX_Complete_Design.figcraft -o designs/Simba_UI_UX_Complete_Design.fig --format fig
```

The second argument picks the typeface:

- `intended` — the families the app asks for. This is the design.
- `fallback` — Roboto, which is what Android actually rendered **before** the
  font-resolution fix of 2026-11-09 (see
  `md/SIMBA_APP_PAGE_ISSUE_SCAN.md` S-025 … S-029). Kept so the two states
  can be compared side by side.

The lockup can be swept without touching the app — every knob is a flag:

```sh
node designs/build-login-design.js intended light --only=peak \
  --lion=108 --wordmark-size=58 --wordmark-lh=66 --wordmark-gap=12 \
  --tagline-size=22 --tagline-lh=28 --tagline-gap=4 --tagline-ls=0.4
```

`--only=peak|rest|both` picks which page(s) to generate.

## The Penpot canvas

The same app lives in Penpot as a **page** (`SIMBA`) of one file. The generator
is `build-penpot-app.js`; it reads the app's own sources the way
`build-login-design.js` does, so the boards cannot drift from the code.

The pipeline is four passes, and **the order is the pipeline**:

| pass | what it does | why it cannot move |
|---|---|---|
| 1. media | uploads the pictures, records their ids | a board refers to a picture by id, so the picture has to be in the file first |
| 2. boards | draws the boards | a board build **removes and recreates** the boards it owns |
| 3. links | draws the connectors | the connectors refer to boards by id — they need the boards |
| 4. flow | creates the app flow | every pass before it removes the flows, so the flow is always last |

```sh
node designs/build-penpot-app.js          # generate the payloads
node designs/run-media.js <probe>          # pass 1 — upload the pictures
node designs/build-penpot-app.js          # again, now with the ids
node designs/run-mcp.js build <probe>      # pass 2 — the boards
node designs/run-mcp.js links <probe>      # pass 3 — the connectors
node designs/run-mcp.js flow <probe>       # pass 4 — the app flow
```

The **probe** is the transport that talks to the Penpot MCP endpoint. It is not
in this repository because the endpoint's URL and its key live in the agent's
own MCP settings; pass its path as an argument, or set `$PENPOT_PROBE`.

### Two owners, and what they own

The media ids are the part that bites, because there are two places they can
live and they used to disagree:

- `designs/.build/penpot-media-ids.json` — **the owner**. One file, so a later
  upload cannot overwrite the ids an earlier one reported.
- `designs/.build/penpot-media-result-N.json` — a legacy per-call file. It is
  read only to *fill* a key the store does not have; it may never override one.
  (It did exactly that once: the dark lion's fresh id was replaced by an
  older batch's id, and the board kept the old ink.)

The **fingerprint** — the sha1 of the bytes that were uploaded — says which
picture an id refers to. It has to be written at **upload time**, by
`run-media.js`, for the bytes it actually sent. A picture that changed on
disk and has not been uploaded yet must keep the fingerprint it had, or the
build would believe the new picture is already in Penpot, keep the old id and
never upload it again.

### The limits

- The endpoint rejects a body over ~85 KB (measured: HTTP 413), and the body
  is bigger than the base64 it carries — so one media call carries 60 KB.
- Every call has a **120 s ceiling**. Four boards in one call does not fit;
  the build splits them, and the login boards are one call per theme.
- The layout wait must be **bounded and polled**. An unbounded
  `waitForLayoutUpdate()` hangs past the ceiling and takes the whole run
  with it.

## Three FigCraft quirks worth knowing

All three cost time while this document was built; they are recorded so the
next person does not lose them again.

1. **Every frame gets a default WHITE fill.** A container frame that should
   be transparent has to say so explicitly (`fill: 'none'`), otherwise it
   paints over the background — and over the gold orb that sits behind it.
2. **Frames clip their children by default.** React Native does not clip
   overflow, and the orb pulses past the logo stack's box, so that frame
   needs `clip: false`.
3. **One schema quirk:** `effect.add` wants `{type, color, offset: [x, y],
   radius, spread, visible}` — the `type` lives **inside** the effect object
   and `offset` must be a 2-tuple, not `{x, y}`.

## One more: pages are created by `page.add`

A second screen is a second **page** (`page.add`), not a second frame on the
first page — so every page is one screen of the app, and `figcraft-cli render
--page "<name>"` renders one of them. The generator builds the whole document
in one command script, so the two screens cannot drift apart.
