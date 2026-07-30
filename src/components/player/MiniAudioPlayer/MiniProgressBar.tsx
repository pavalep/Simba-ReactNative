import React, {useRef, useEffect} from 'react';
import {StyleSheet, Animated} from 'react-native';
import {useTheme} from '../../../theme';

interface MiniProgressBarProps {
  progress: number; // 0..1
}

const BAR_HEIGHT = 2;

export const MiniProgressBar: React.FC<MiniProgressBarProps> = ({progress}) => {
  const {colors} = useTheme();
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [progress, animWidth]);

  return (
    <Animated.View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: colors.accent.gold,
            width: animWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    backgroundColor: 'transparent',
  },
  fill: {
    height: BAR_HEIGHT,
  },
});
