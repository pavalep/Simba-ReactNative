import React from 'react';
import {Text, type StyleProp, type TextStyle} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';

interface HighlightedTextProps {
  text: string;
  query: string;
  variant?: 'primary' | 'subtitle';
  style?: StyleProp<TextStyle>;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  query,
  variant = 'primary',
  style,
}) => {
  const {colors} = useTheme();

  if (!query || !text) {
    if (variant === 'subtitle') {
      return text ? (
        <AppText variant="caption" color="tertiary" numberOfLines={1}>
          {text}
        </AppText>
      ) : null;
    }
    return (
      <AppText variant="body2" color="primary" numberOfLines={1} style={style}>
        {text}
      </AppText>
    );
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: {t: string; hl: boolean}[] = [];
  let lastIdx = 0;
  let idx = lowerText.indexOf(lowerQuery, lastIdx);
  while (idx !== -1) {
    if (idx > lastIdx) {
      parts.push({t: text.slice(lastIdx, idx), hl: false});
    }
    parts.push({t: text.slice(idx, idx + query.length), hl: true});
    lastIdx = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIdx);
  }
  if (lastIdx < text.length) {
    parts.push({t: text.slice(lastIdx), hl: false});
  }

  if (parts.length === 0) {
    if (variant === 'subtitle') {
      return (
        <Text numberOfLines={1} style={{color: colors.text.tertiary, fontSize: 12}}>
          {text}
        </Text>
      );
    }
    return (
      <AppText variant="body2" color="primary" numberOfLines={1} style={style}>
        {text}
      </AppText>
    );
  }

  if (variant === 'subtitle') {
    return (
      <Text numberOfLines={1} style={{color: colors.text.tertiary, fontSize: 12}}>
        {parts.map((part, i) => (
          <Text
            key={i}
            style={
              part.hl
                ? {color: colors.accent.gold, fontWeight: '500'}
                : {color: colors.text.tertiary}
            }>
            {part.t}
          </Text>
        ))}
      </Text>
    );
  }

  return (
    <Text
      numberOfLines={1}
      style={[{color: colors.text.primary, fontSize: 14}, style]}>
      {parts.map((part, i) => (
        <Text
          key={i}
          style={
            part.hl
              ? {color: colors.accent.gold, fontWeight: '600'}
              : {color: colors.text.primary}
          }>
          {part.t}
        </Text>
      ))}
    </Text>
  );
};
