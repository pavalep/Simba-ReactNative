# SIMBA V19 — Player UI Research & Overhaul Specification

> **Status:** binding. Wave 8 revises the player chrome against this document.
> **Quality bar (owner-set, 2026-10-05):** *Huawei Video / Tencent Video (腾讯视频)
> class.* Not "a working player" — a player that reads as product-grade the first
> time it opens.
> **Owner's assessment of the state we inherited:** ~5% complete.
>
> **On the wave number.** This document was written before the collision below
> was noticed, and it labels its phases `W7.1`…`W7.6`. The TRACKER already had a
> **Wave 7** (acceptance matrix + accessibility + responsive QA, still pending),
> so the UI overhaul is **Wave 8**. The source code's `W7.x` comments were left
> as they are rather than churned — renaming them would invalidate every comment
> that cites a phase number, and the phase names still identify the work
> unambiguously. The TRACKER's Wave 8 section is the execution log.
>
> **Outcome:** shipped in two commits, `c88944a` (phases 1–3) and `ef463c4`
> (phases 4–6), 2026-10-05. 74 suites / 909 tests green. Carried-forward items
> are listed at the end of the TRACKER's Wave 8 section.

---

## 0. How to read this document

§1 is the **audit** — what is actually wrong, each item traceable to a file and
line in the current tree. §2 is the **diagnosis** — why those symptoms share a
small number of root causes. §3 is the **target** — what the surface becomes.
§4 is the **migration plan**.

Nothing in §1 is stylistic opinion. Every entry is a fact about the code as it
stands today.

---

## 1. The audit

### 1.1 Legibility — the controls float on raw video

| # | Defect | Evidence |
|---|---|---|
| 1.1.1 | **The transport bar has no scrim at all.** | `TransportBar.tsx:361` — `row: { width: '100%' }`. No background, no gradient, nothing. SPEC §3.3 requires "a single fixed-position gradient scrim". It does not exist. Icons are drawn directly on an arbitrary film frame, so on a bright frame the white 80% ink washes out entirely and on a dark frame the gold accent is the only thing that reads — which is exactly the "partial render" the owner reported. |
| 1.1.2 | The header scrim is a **hard rectangle**, not a gradient. | `VideoTitleOverlay.tsx` — solid `background.scrimDeep` bar with square bottom edge. It reads as a black slab bolted to the top of the video rather than as part of it. |
| 1.1.3 | The two scrims do not belong to one system. | The header is opaque black; the transport is fully transparent. There is no shared elevation, so the top and bottom of the screen look like two different products. |

### 1.2 Hit targets — "partially hidden" and "not clickable"

The owner's phrasing was *partially hidden*. The cause is not clipping — it is
**scale inconsistency**, and the numbers had drifted apart per component:

| Component | Icon size | Target | Press feedback |
|---|---:|---:|---|
| `TransportRow` | 28 | 44 (56 play) | opacity 0.7 |
| `VideoTitleOverlay` | 24 / 22 | 44 | opacity 0.6 |
| `More` | **20** | 44 | opacity 0.7 |
| `PiPToggle` | 24 | 44 | opacity 0.7 |
| `CaptionsToggle` | 24 | 44 | opacity 0.7 |

| # | Defect | Evidence |
|---|---|---|
| 1.2.1 | `More` draws a **20 px** glyph — below the ~24 px minimum for an interactive graphic in both the Material and Apple legibility guidance. | `More.tsx:68` — `size={20}`. A 20 px mark reads as a decoration, not a target, and is visually inconsistent sitting one row below 28 px transport icons. |
| 1.2.2 | Icon and hit area are **decoupled**. Each button declares `minHeight/minWidth: 44` and then also relies on `hitSlop={8}`, which extends the touch region *beyond* the control's own bounds. | `TransportRow.tsx:94,119,130,152,169`. Adjacent controls in a row therefore have overlapping inflated regions and compete for the same taps — the literal mechanism behind "some icons are not clickable". |
| 1.2.3 | **Opacity-only press feedback.** | All secondary controls use `pressed ? {opacity: 0.7}`. Over arbitrary video with no background behind the glyph, a 30 % dip on a transparent icon is close to invisible. Only play/pause has a scale (`0.96`). |
| 1.2.4 | **No shared primitive.** Icon size, target, press behaviour, haptic, accessibility role and label were each re-declared at every call site. | Six components, six sets of numbers. Nothing prevented drift, and it drifted. |

### 1.3 Layout — the surface looks stripped and unbalanced

| # | Defect | Evidence |
|---|---|---|
| 1.3.1 | `TransportRow` uses `justifyContent: 'space-between'`, and **Previous/Next return `null`** when there is no adjacent item. | `TransportRow.tsx:110,146,182`. On a single-item playlist the row collapses to three controls that then spread edge-to-edge. The primary transport looks broken rather than minimal. The `null` rule is correct per SPEC §3.3 (a dead spacer is worse) but the *layout* was designed assuming five items, so the fallback is ugly. |
| 1.3.2 | Row 3 uses `space-between` with two `flexDirection: 'row'` children. | `TransportBar.tsx:374-389`. When `CaptionsToggle` and `PiPToggle` self-collapse, left and right groups fly to opposite screen edges with a large empty gulf between them — visually random. |
| 1.3.3 | **No volume control exists anywhere.** Volume is only reachable by vertical swipe — an undiscoverable gesture with no visible affordance. | Absent from `TransportRow`, `TransportBar`, `VideoTitleOverlay`. Every reference app in the research bar carries a visible volume affordance. |
| 1.3.4 | Three separate rows of controls with **no visual grouping** — no dividers, no shared container, no weight hierarchy beyond the gold play button. | `TransportBar.tsx` rows 1/2/3. |

### 1.4 The secondary sheet — the worst surface in the player

| # | Defect | Evidence |
|---|---|---|
| 1.4.1 | **The backdrop is a plain `View`, not pressable — so tapping outside does nothing.** This is the "cannot close" the owner reported. | `VideoMoreSheet.tsx:358` — `<View style={[styles.backdrop, ...]}>`. The only dismiss paths are Android back (`onRequestClose` exists, correct) and a close button buried at the **bottom** of a 90 %-height sheet. |
| 1.4.2 | `maxHeight: '90%'` — it is not a sheet, it is a near-full-screen takeover. | `VideoMoreSheet.tsx:630`. No detent, no half-height resting state. |
| 1.4.3 | **Information architecture is wrong.** A **Sleep timer** (a podcast feature) sits in the *video* player. Playback settings (speed, quality) are interleaved with library actions (Save, Track info, Share). There is no Audio & Subtitles group. Repeat — a canonical sheet setting — is instead in the transport bar. | `VideoMoreSheet.tsx:369,387,417,502-517`. |
| 1.4.4 | **A wall of chips.** 6 speed + N quality + N sleep pills in one scroll, all equal weight. | No hierarchy; the user cannot tell what is current at a glance. |
| 1.4.5 | Section headers use `variant="h2"` — **display type** — for a sheet section label. | `VideoMoreSheet.tsx:369,387,417,438`. |
| 1.4.6 | No drag-to-dismiss, no spring, no staged entrance. Only `animationType="slide"`. | `VideoMoreSheet.tsx:353`. |

### 1.5 Motion

| # | Defect | Evidence |
|---|---|---|
| 1.5.1 | Chrome auto-hide is opacity 0/1 with **no translate, no easing refinement**. | `ChromeAutoHideController.tsx` |
| 1.5.2 | The only animation in the whole chrome is the title fade (`180 ms`). There is no orchestrated moment anywhere — no staged row entrance, no scrub-preview spring, no chip press. | `VideoTitleOverlay.tsx` |

### 1.6 Dead and duplicated surface

| # | Defect | Evidence |
|---|---|---|
| 1.6.1 | **Five stub components (~200 bytes each) still exist in the tree.** | `FlashingLightsBadge.tsx` (210 B), `ReduceMotionController.tsx` (238 B), `SmartResumePrompt.tsx` (194 B), `InteractiveTranscript.tsx` (206 B), `VideoMiniPlayer.tsx` (186 B). Each is a `() => null`. |
| 1.6.2 | **Two competing "More" sheets.** | `TransportBar/MoreSheet.tsx` (6.4 KB) **and** `VideoMoreSheet/VideoMoreSheet.tsx` (24.9 KB). |
| 1.6.3 | Two competing "Mode"/"Captions" sheets parallel to the above. | `ModeSheet.tsx`, `CaptionsSheet.tsx` |

---

## 2. Diagnosis — four root causes, not twenty symptoms

**R1 — No shared control primitive.** Every control re-declared its own icon size,
target, press treatment and haptic. That single omission produces §1.2 entirely,
and most of §1.3's "looks unbalanced" (nothing is measured against a grid).

**R2 — The surface has no elevation model.** The chrome is painted straight onto
the video with no scrim, so legibility depends entirely on the frame underneath.
This produces §1.1 entirely and is the single largest contributor to "not premium":
premium players *design the backdrop*, they do not hope the content is dark.

**R3 — Layout was authored for the five-control case and degrades badly.** The
`space-between` rows assume a fixed number of children. When optional controls
self-collapse (which the SPEC correctly requires), the layout has no defined
fallback, so it produces §1.3.1/1.3.2.

**R4 — The secondary surface was never designed as an information architecture.**
It accreted features and was never re-grouped, producing §1.4.

**A fifth, structural, non-visual root cause** — and the reason the UI drifted in
the first place:

**R5 — Design was specified in prose and implemented without a visual check.** The
SPEC described what each surface *owns* but never defined a single number for
spacing, radius, elevation, icon size, target size, or motion. With no numbers, an
implementation cannot be wrong — there is nothing to be wrong against. §3 exists to
close that.

---

## 3. The target

### 3.0 The control surface system (new, binding)

One primitive owns the numbers. Nothing in the chrome hand-rolls them again.

| Token | Value | Rule |
|---|---:|---|
| `CONTROL_TARGET` | **44** | Every hit area. Never smaller. No `hitSlop` — the target is the control, so adjacent controls cannot overlap. |
| `CONTROL_PRIMARY_TARGET` | **56** | Play/pause only. |
| `CONTROL_ICON_SIZE` | **24** | Floor for an interactive graphic over video. |
| `CONTROL_ICON_SIZE_COMPACT` | **22** | Secondary row only. Never 20. |
| `CONTROL_ICON_SIZE_TRANSPORT` | **28** | Primary transport cluster. |
| `PRESSED_SCALE` | **0.90** | On the UI thread (`useNativeDriver`). |
| `PRESSED_OPACITY` | **0.60** | Secondary term, not the only one. |

Rationale for scale *in addition to* opacity: the backdrop is arbitrary video, so
a change in the glyph's own contrast is the only feedback guaranteed to be visible.
Opacity alone is not.

### 3.1 The scrim (fixes §1.1)

A **single** full-bleed scrim behind the whole chrome, not two opaque bars:

- **Bottom:** transparent → `rgba(0,0,0,0.72)` over the lower ~38 % of the frame.
- **Top:** transparent → `rgba(0,0,0,0.55)` over the upper ~18 %, for the header.
- One continuous surface, so top and bottom read as one system.
- Implementation must not add an unverified native dependency. Options are
  `react-native-linear-gradient` (verify it builds under the new architecture
  first) or a stacked-band fallback; **do not** ship a hard rectangle.

### 3.2 Transport bar composition (fixes §1.3)

```
  0:17  ─────────────────────────●───────────────  -1:27
        ‹rewind10   ⏮   ( ▶ )   ⏭   forward10›   🔊
        Off · CC                    PiP   ⚙
```

- **Row 1** — scrub track. Unchanged behaviour; gains the scrim behind it.
- **Row 2** — transport. Previous/Next keep self-collapsing, **but the row centres
  its children on a fixed rhythm** instead of `space-between`, so a three-control
  row is centred and balanced rather than stretched to the edges.
- **Row 2 adds a volume control** (mute toggle + level), right of Forward. Backed
  by the lib's real volume commands — a control that cannot act does not render.
- **Row 3** — mode/captions left, PiP/More right, on a shared horizontal rhythm
  with a fixed gutter, so self-collapsing controls leave an even gap rather than a
  gulf.

### 3.3 The secondary sheet (fixes §1.4)

- **Detent:** resting height ~62 % of the window, expandable to ~92 %. Not a
  full-screen takeover.
- **Dismiss:** scrim tap · drag down · Android back · explicit close. All four.
  The backdrop becomes a `Pressable`.
- **Grouping** — playback settings and library actions are separated:

  ```
  PLAYBACK
    Speed            1×               ›
    Quality          Auto (1080p)     ›
    Repeat           Off              ›
  AUDIO & SUBTITLES
    Subtitles        English          ›
    Audio track      English 5.1      ›
  LIBRARY
    Save · Add to playlist
  MORE
    Track info · Share
  ```

- **Value rows, not chip walls.** Each setting is one row showing
  `label … current value ›`. A single row is scannable; twenty pills are not.
  Only genuinely multi-valued, frequently-switched settings (speed) may stay as
  a compact segmented row.
- **Headers** are small uppercase eyebrows, never display type.
- **Sleep timer leaves the video player** — it is a podcast feature. It stays in
  the music player only.

### 3.4 Motion (fixes §1.5)

| Moment | Behaviour |
|---|---|
| Chrome show/hide | Opacity **and** 8 px translate, 200 ms, `ease-out`; hidden state fully non-interactive. |
| Press | Scale 0.90 + opacity 0.60, spring, UI thread. |
| Sheet present/dismiss | Translate-Y spring from the detent, scrim cross-fade. |
| Row entrance | On first show, rows rise 8 px staggered ~40 ms apart. |
| Scrub thumb | Grows on grab; scrub preview springs rather than pops. |
| Reduced motion | All of the above collapse to instant, gated on `useReduceMotion` (WCAG 2.3.3). |

### 3.5 Housekeeping (fixes §1.6)

- Delete the five `() => null` stubs, or implement them. A stub in a live tree is
  forbidden by SPEC §0.3 I2.
- Collapse to **one** More sheet, **one** Mode sheet, **one** Captions sheet. The
  duplicates are two owners of one value.

---

## 4. Migration

Wave 7, in dependency order — each step is independently shippable and gated.

| Step | Work | Fixes |
|---|---|---|
| 7.1 | `PlayerControl` primitive + tokens | R1, §1.2 |
| 7.2 | Unified scrim behind the whole chrome | R2, §1.1 |
| 7.3 | Transport rhythm + volume control | R3, §1.3 |
| 7.4 | Sheet: detent, scrim dismiss, regroup, value rows | R4, §1.4 |
| 7.5 | Motion pass | §1.5 |
| 7.6 | Delete stubs, collapse duplicate sheets | §1.6 |

**Binding invariants for this wave** (added to SPEC §0.3):

- **I11 — one control primitive.** No chrome component may hand-roll an icon size,
  a hit target, or a press treatment. It composes `PlayerControl` or it does not
  ship.
- **I12 — the chrome owns its backdrop.** A control painted on an unpainted
  video frame is a defect regardless of how legible the current frame happens to
  be. Legibility is a property of the surface, not of the content.
- **I13 — a layout must define its own fallback.** A row whose children can
  disappear must remain balanced when they do.

**Sources for the design bar:** see
`md/SIMBA_PLAYER_V19_UI_RESEARCH.md` for the Huawei / Tencent / Apple / Material
reference set with URLs.
