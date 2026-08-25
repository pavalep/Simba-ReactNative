# Video Player V3 Wave A

This directory is the clean-room foundation for SIMBA’s next video player. Wave A contains only presentation-independent domain contracts, a typed native mpv session adapter, command serialization, capability negotiation, and state mapping.

The directory is intentionally not a presentation module yet. Full, mini, PiP, controls, panels, icons, styles, and animations will be added in later waves against these ports. A future presentation host must depend on `VideoV3ViewState`, `VideoV3IntentDispatcher`, and `VideoV3SurfacePort`, not on native mpv internals.

## Boundary rules

- Do not import from another video-player implementation.
- Do not copy or rename presentation components, styles, icons, layouts, or state objects into this directory.
- Keep native mpv access behind `VideoV3SessionPort`.
- Keep user intent behind `VideoV3IntentController`.
- Keep derived render state behind `VideoV3StateAdapter`.
- Preserve one native session across presentation changes.
- Release listeners, timers, and native resources idempotently.
- Omit unsupported capabilities instead of returning dead controls.

Wave A is not runtime-verified. Manual playback acceptance begins only after later implementation waves add a real presentation host.
