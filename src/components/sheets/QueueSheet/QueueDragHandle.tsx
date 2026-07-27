import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SvgIcon} from '../../utility/SvgIcon/SvgIcon';

interface QueueDragHandleProps {
  color?: string;
  size?: number;
}

/**
 * Drag handle indicator shown on each queue item to signal reorder-ability.
 * Phase 23.3 — drag-reorder handle.
 */
export const QueueDragHandle: React.FC<QueueDragHandleProps> = ({
  color,
  size = 18,
}) => {
  return (
    <View style={styles.container}>
      <SvgIcon name="list" size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 8,
  },
});
