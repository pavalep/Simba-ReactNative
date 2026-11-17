import React, {useState} from 'react';
import {View} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../AppText/AppText';
import {MediaImage} from '../../utility/MediaImage/MediaImage';
import {FONT_FAMILY} from '../../../constants/fontFamily';

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

/**
 * User avatar — the photo when there is one, the initials when there
 * is not.
 *
 * WHY THE PHOTO IS RENDERED HERE (and why it used not to be)
 * ──────────────────────────────────────────────────────────────
 *
 * This component's `uri` branch drew the INITIALS inside a highlighted
 * disc, with the comment *"The avatar image would go here, via
 * `<MediaImage>`, once an image URL is available. For now we render a
 * fallback."* But the URL WAS available — `useAuth()` carries the
 * Google photo — so the branch was a placeholder that never got
 * filled in.
 *
 * The result was two avatars in one app: the Home header's avatar
 * (which draws the photo with `MediaImage` directly) showed the real
 * face, while the Profile's and the Settings' showed the initials.
 *
 * So the photo is rendered here, through the app's own `MediaImage`
 * (React Native's `Image` — `react-native-fast-image` is gone; see
 * that component's own note). If the photo fails to load, the
 * initials are what the user sees, and a photo that arrives later
 * replaces them.
 *
 * The initials are the fallback, not the primary: the disc is the
 * theme's `border.subtle` and the initials are `text.secondary`,
 * which is the same treatment the Profile board draws.
 */
export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
}) => {
  const {colors} = useTheme();
  const [photoFailed, setPhotoFailed] = useState(false);

  const initials = name
    ? name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const fontSize = Math.round(size * 0.38);

  const disc = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (uri && !photoFailed) {
    return (
      <View
        style={{
          ...disc,
          overflow: 'hidden',
          backgroundColor: colors.border.subtle,
        }}>
        <MediaImage
          source={uri}
          style={{width: size, height: size}}
          resizeMode="cover"
          onError={() => setPhotoFailed(true)}
        />
      </View>
    );
  }

  // The monogram — the initials of the name, or the app's own signed-out
  // default.
  //
  // There is NO person glyph in the app's icon set, and the music note that
  // used to stand here was a MEDIA glyph on an ACCOUNT avatar: every
  // signed-out user saw a music note as their profile picture. The Home
  // header already draws the signed-out avatar as a letter
  // (`HomeHeader.tsx:195-199`: the first letter of the name, or 'A'), so
  // that is the letter used here — one treatment for one state.
  return (
    <View
      style={{
        ...disc,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.border.subtle,
      }}>
      <AppText
        style={{
          // The weight lives in the FAMILY key, never in a
          // `fontWeight` prop — see `src/constants/fontFamily.ts`.
          fontFamily: FONT_FAMILY.inter.semibold,
          fontSize,
          lineHeight: Math.round(fontSize * 1.2),
          color: colors.text.secondary,
        }}>
        {initials || 'A'}
      </AppText>
    </View>
  );
};
