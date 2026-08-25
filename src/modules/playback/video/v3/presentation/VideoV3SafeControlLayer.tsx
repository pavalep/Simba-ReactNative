import React from 'react';
import type {VideoV3ControlLayerProps} from './VideoV3ControlLayer';
import {VideoV3ControlLayer} from './VideoV3ControlLayer';
import {useVideoV3PresentationGeometry} from './useVideoV3PresentationGeometry';

type SafeControlLayerProps = Omit<VideoV3ControlLayerProps, 'geometry'>;

/**
 * Inset-aware V3 control layer. The media surface remains edge-to-edge while
 * all interactive chrome is derived from current safe-area and viewport data.
 */
export function VideoV3SafeControlLayer(props: SafeControlLayerProps) {
  const geometry = useVideoV3PresentationGeometry();
  return <VideoV3ControlLayer {...props} geometry={geometry} />;
}
