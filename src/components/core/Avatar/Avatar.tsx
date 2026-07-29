import React from 'react';
import {View} from 'react-native';
import {AppText} from '../AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon/SvgIcon';

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

/**
 * User avatar — shows image when available, otherwise falls back to
 * initials or a generic person icon.
 */
export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
}) => {
  const initials = name
    ? name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const fontSize = size * 0.38;

  if (uri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}>
        {/* Inline <Image> would go here with FastImage for production.
            For now we render a fallback until image URL is available. */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <AppText
            style={{fontSize, fontWeight: '600', color: '#EDEDED'}}>
            {initials}
          </AppText>
        </View>
      </View>
    );
  }

  // Fallback: initials or icon
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
      }}>
      {initials ? (
        <AppText
          style={{fontSize, fontWeight: '600', color: 'rgba(237,237,237,0.65)'}}>
          {initials}
        </AppText>
      ) : (
        <SvgIcon name="music" size={size * 0.5} color="rgba(237,237,237,0.4)" />
      )}
    </View>
  );
};
