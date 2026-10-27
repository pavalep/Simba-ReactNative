/**
 * The Home screen's floating action button.
 *
 * ## Why it is a component of its own
 *
 * Every other screen in the app that has a FAB has it as a component of
 * its own — `BrowseFab` on Movies, Music and Podcasts, `Fab` on Radio
 * and Live TV. Home had it inline in the screen, which is why nothing
 * could assert where it sits.
 *
 * ## Where it sits
 *
 * A FAB FLOATS. It sits one spacing step above the safe area and it
 * overlaps whatever is under it — the overlap is the point of a
 * floating button, not a defect.
 *
 * The offset used to be `insets.bottom + 100`: the clearance for the
 * floating bottom tab bar the app used to have (60 dp plus a 10 dp
 * margin). That bar was deleted in v11 Wave 1 and the number was never
 * revised, so the button hung 124 dp above the bottom edge, in the
 * middle of the Explore rail. The app's other five FABs have always
 * used `insets.bottom + spacing.lg` — this is now the same rule.
 */

import React from 'react';
import {TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {homeScreenStyles as styles} from '../styles/HomeScreen.styles';

export interface HomeFabProps {
  /** Opens the system file picker and plays whatever comes back. */
  onPress: () => void;
}

export const HomeFab: React.FC<HomeFabProps> = ({onPress}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Play media file"
      style={[
        styles.fab,
        {
          backgroundColor: colors.accent.gold,
          bottom: insets.bottom + spacing.lg,
          // Shadow (colors.shadow — inline; static styles are color-free)
          shadowColor: colors.shadow,
          shadowOffset: {width: 0, height: 3},
          shadowOpacity: 0.3,
          shadowRadius: 4.5,
        },
      ]}>
      <SvgIcon name="play" size={24} color={colors.text.inverse} />
    </TouchableOpacity>
  );
};
