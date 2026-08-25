# Video Player V3 Wave A

This directory is the clean-room foundation for SIMBA’s next video player. Wave A contains only presentation-independent domain contracts, a typed native mpv session adapter, command serialization, capability negotiation, and state mapping.

The directory is intentionally not a presentation module yet. Full, mini, PiP, controls, panels, icons, styles, and animations will be added in later waves against these ports. A future presentation host must depend on `VideoViewState`, `VideoIntentDispatcher`, and `VideoSurfacePort`, not on native mpv internals.

## Boundary rules

- Do not import from another video-player implementation.
- Do not copy or rename presentation components, styles, icons, layouts, or state objects into this directory.
- Keep native mpv access behind `VideoSessionPort`.
- Keep user intent behind `VideoIntentController`.
- Keep derived render state behind `VideoStateAdapter`.
- Preserve one native session across presentation changes.
- Release listeners, timers, and native resources idempotently.
- Omit unsupported capabilities instead of returning dead controls.

Wave A is not runtime-verified. Manual playback acceptance begins only after later implementation waves add a real presentation host.
