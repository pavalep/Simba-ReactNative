import React from 'react';
import type {VideoControlLayerProps} from './VideoControlLayer';
import {VideoControlLayer} from './VideoControlLayer';
import {useVideoPresentationGeometry} from './useVideoPresentationGeometry';

type SafeControlLayerProps = Omit<VideoControlLayerProps, 'geometry'>;

/**
 * Inset-aware V3 control layer. The media surface remains edge-to-edge while
 * all interactive chrome is derived from current safe-area and viewport data.
 */
export function VideoSafeControlLayer(props: SafeControlLayerProps) {
  const geometry = useVideoPresentationGeometry();
  return <VideoControlLayer {...props} geometry={geometry} />;
}
