import {useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useWindowDimensions} from 'react-native';
import {
  calculateVideoV3SafeGeometry,
  type VideoV3SafeGeometry,
} from './VideoV3PresentationTypes';

export function useVideoV3PresentationGeometry(): VideoV3SafeGeometry {
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  return useMemo(
    () => calculateVideoV3SafeGeometry(
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
