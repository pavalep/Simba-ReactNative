import {useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useWindowDimensions} from 'react-native';
import {
  calculateVideoSafeGeometry,
  type VideoSafeGeometry,
} from './VideoPresentationTypes';

export function useVideoPresentationGeometry(): VideoSafeGeometry {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  return useMemo(
    () => calculateVideoSafeGeometry(
      {
        top: insets.top,
        right: insets.right,
        bottom: insets.bottom,
        left: insets.left,
      },
      {width, height},
    ),
    [height, insets.bottom, insets.left, insets.right, insets.top, width],
  );
}
