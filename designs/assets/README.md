# designs/assets

The files the Penpot prototype owns — the artwork the board cannot
reproduce from the app's own sources.

## `weather-chip.png`

The Home greeting's weather chip, **as the app itself draws it**.

### Why it is a picture and not the real thing

The chip is `src/components/utility/WeatherIcon/WeatherChip.tsx`: a
**Meteocons Lottie** animation over a **LinearGradient** backdrop
(`WeatherChip.tsx:76-87`). Penpot can hold an image and it can hold a
flat fill, but it cannot hold a Lottie and it cannot render a gradient —
so the board's chip is a still frame of the app's own chip.

That is the right way round. The alternative — redrawing the chip as a
Penpot shape — would have produced a *different* chip, and the board's
whole job is to be the app's design, not a picture of a design.

### Its provenance — verified, not assumed

- **What it is:** the `partlyCloudy` chip — a gold sun behind a pale-blue
  cloud on a sky-blue gradient, with the app's 12 dp corner radius
  (`radius.md`).
- **The chip in the app:** 56 × 56 dp (`WeatherChip.tsx:42`).
- **The file:** 168 × 168 px — exactly **3×** the 56 dp chip.
- **Its gradient matches the app's palette.** Measured off the PNG's own
  pixels and compared with `WEATHER_PALETTE.partlyCloudy`
  (`WeatherIcon.types.ts:77-81`):

  | where | measured | the app's token |
  |---|---|---|
  | top centre | `#4390d4` | `top: '#3F8DD3'` |
  | mid left | `#5ca6dd` | (between the two) |
  | bottom centre | `#77bee7` | `bottom: '#7AC0E8'` |

  The few counts of drift are the 3× downscale and the glyph's own
  pixels — the endpoints are the app's, not a redrawing's.

- **Where it came from:** a capture of the app's own rendering on a
  device, cropped to the chip's bounds. The chip is animated and
  gradient-backed, so it cannot be regenerated from source — there is no
  Lottie rasteriser in the toolchain.

### Why it is here and not regenerated

This file is the artifact of record, and this README is the record of
where it came from. If the app's chip changes, this file has to be
re-captured and the board has to be rebuilt with it.

### The rule it follows

A prototype asset is either **the app's own pixels** or it is nothing.
It is never a redrawing. Every other image on the board is either the
app's own asset (`ASSETS` in `designs/penpot/media.js`) or a raster of
the app's own SVG glyph (`icons.js`); this file is the one case where
the app draws something the board's toolchain cannot hold, so it is a
capture.

### The rule for the future

A file in this folder must be able to answer **"whose pixels are
these?"** with a sentence that names the app file it came from. If it
cannot, it does not belong here.
