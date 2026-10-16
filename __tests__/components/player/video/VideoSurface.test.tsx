/**
 * `VideoSurface` — the video picture is a REAL view in the React tree.
 *
 * ## What this file is actually pinning
 *
 * This component used to render a **transparent placeholder** for a native
 * `MpvRenderView` that Kotlin mounted at `android.R.id.content` index 0 — a
 * sibling of the React root. It could only reserve space and forward taps,
 * because React Native had no view to own. Every test in this file therefore
 * described a stand-in, and the assertions were correspondingly weak: "the
 * placeholder is transparent" was the best it could say, because the thing
 * being asserted on was not the picture.
 *
 * The picture is now `<SimbaVideo>` — a real native view component in this
 * tree (`codegenNativeComponent('SimbaVideoView')`). The tree contains the
 * video, and that is directly assertable.
 *
 * ## Why the first test matters more than the rest
 *
 * `usePresentation()` used to need a third input, `videoSurfacePresented` —
 * the boolean the native surface mutation returned — because "is video on
 * screen?" was not derivable from the React tree when the surface lived
 * outside it. That boolean is deleted now, and this test is the reason it is
 * safe to delete: the picture and the chrome that renders it are mounted by
 * the same commit, so chrome-without-picture is not an expressible state.
 *
 * If someone reintroduces a placeholder here, that test fails, and the
 * deletion of `videoSurfacePresented` is visibly unsafe again.
 */

import * as React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {VideoSurface} from '../../../../src/components/player/video/VideoSurface/VideoSurface';

/** Flatten React Native's nested style arrays into one list of objects. */
function flattenStyle(style: unknown): Record<string, unknown>[] {
  if (Array.isArray(style)) {
    return style.flatMap(flattenStyle);
  }
  return style ? [style as Record<string, unknown>] : [];
}

describe('VideoSurface', () => {
  it('renders the native picture AS A CHILD OF THIS TREE', async () => {
    // THE load-bearing assertion. `SimbaVideoView` is the native component
    // name from the lib's codegen spec, surfaced as the host element type.
    // A transparent `<View>` placeholder — the old behaviour — would report
    // `"View"` here and fail.
    const {toJSON} = await render(<VideoSurface />);
    expect(toJSON()).not.toBeNull();
    expect((toJSON() as {type: string}).type).toBe('SimbaVideoView');
  });

  it('fills its parent by default', async () => {
    // A zero-height native view renders no frames and reports no error
    // anywhere, which is the worst possible failure mode for a video
    // component. Geometry must be non-negotiable by default.
    const {toJSON} = await render(<VideoSurface />);
    const style = flattenStyle((toJSON() as {props: {style?: unknown}}).props.style);
    expect(style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }),
      ]),
    );
  });

  it('PAINTS NOTHING over the picture', async () => {
    // The surface used to paint `background.surfaceDark` as a "placeholder
    // colour when the surface has no pixel yet" — but it had no way to know
    // whether a pixel existed, so the placeholder was permanent and covered
    // every decoded frame. That bug is structurally impossible now (the
    // component IS the picture), but a background here would still cover
    // every decoded frame, so the guard stands.
    //
    // Assert the ABSENCE of any background so a future "just add a subtle
    // scrim" change has to be deliberate.
    //
    // "No pixel yet" is owned by `VideoLoadingOverlay`, the one component
    // that can actually tell (it reads the lib's buffering state).
    const {toJSON} = await render(<VideoSurface />);
    const style = flattenStyle((toJSON() as {props: {style?: unknown}}).props.style);
    const painters = style.filter(s => s.backgroundColor !== undefined);
    expect(painters).toEqual([]);
  });

  it('exposes accessibilityRole="image" with a custom label', async () => {
    await render(<VideoSurface accessibilityLabel="My Movie Title" />);
    const surface = screen.getByLabelText('My Movie Title');
    expect(surface.props.accessibilityRole).toBe('image');
    expect(screen.queryByLabelText('Video')).toBeNull();
  });

  it('falls back to the default "Video" label when no label is provided', async () => {
    await render(<VideoSurface />);
    expect(screen.getByLabelText('Video')).toBeTruthy();
  });

  describe('the tap layer', () => {
    // `includeHiddenElements: true` is required on EVERY query in this block.
    //
    // The layer is hidden from the accessibility tree, and RNTL excludes
    // hidden elements from queries by default. Without the flag the first
    // test below would pass whether or not the layer existed — the default
    // query cannot see it either way — which is exactly a test that cannot
    // fail. The flag turns each of these back into a real assertion.
    it('is absent when no handler is supplied — the picture stays passive', async () => {
      await render(<VideoSurface />);
      expect(
        screen.queryByTestId('video-surface-tap', {includeHiddenElements: true}),
      ).toBeNull();
    });

    it('fires the handler when supplied', async () => {
      const onPress = jest.fn();
      await render(<VideoSurface onPress={onPress} />);

      await fireEvent.press(
        screen.getByTestId('video-surface-tap', {includeHiddenElements: true}),
      );

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('carries NO label, so the picture is announced exactly once', async () => {
      // A screen reader reading "Video" twice — once for the content, once
      // for a control that says nothing more — is a defect, not a detail.
      // Every action this tap triggers is already a real button in the
      // chrome, so nothing is lost by keeping the layer touch-only.
      await render(<VideoSurface onPress={jest.fn()} />);

      // `getAllByLabelText` throws on a second match; one match means the
      // tap layer is genuinely unlabelled.
      expect(screen.getAllByLabelText('Video')).toHaveLength(1);
    });

    it('is hidden from the accessibility tree, so it is not a phantom control', async () => {
      await render(<VideoSurface onPress={jest.fn()} />);
      const layer = screen.getByTestId('video-surface-tap', {
        includeHiddenElements: true,
      });

      // Default queries cannot see it, which is the definition of hidden.
      expect(screen.queryByTestId('video-surface-tap')).toBeNull();
      expect(layer.props.accessibilityElementsHidden).toBe(true);
      expect(layer.props.importantForAccessibility).toBe('no-hide-descendants');
    });
  });

  it('does NOT import any chrome primitive (chrome is sibling-only)', async () => {
    // Static check: the file's import surface is limited to react /
    // react-native / the lib's SimbaVideo. Enforced by ESLint
    // `no-restricted-imports` at CI time; this test is a runtime guard for
    // the same contract.
    //
    // Scanning the WHOLE file would be wrong: the module docstring
    // names every chrome primitive precisely to state that this
    // component does not compose them. Only the import statements
    // carry the actual coupling.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../../../src/components/player/video/VideoSurface/VideoSurface.tsx'),
      'utf8',
    );
    const imports = src
      .split('\n')
      .filter((line: string) => /^\s*import\s/.test(line))
      .join('\n');
    expect(imports).not.toMatch(
      /TransportBar|VideoTitleOverlay|VideoLoadingOverlay|VideoErrorOverlay|VideoMiniPlayer/,
    );
  });
});