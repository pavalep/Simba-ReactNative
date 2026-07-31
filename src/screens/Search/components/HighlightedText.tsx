import React from 'react';
import {type StyleProp, type TextStyle} from 'react-native';
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
        <AppText color="tertiary" numberOfLines={1} style={{fontSize: 12}}>
          {text}
        </AppText>
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
      <AppText color="tertiary" numberOfLines={1} style={{fontSize: 12}}>
        {parts.map((part, i) => (
          <AppText
            key={i}
            color={part.hl ? 'accent' : 'tertiary'}
            style={part.hl ? {fontWeight: '500'} : undefined}>
            {part.t}
          </AppText>
        ))}
      </AppText>
    );
  }

  return (
    <AppText
      variant="bodySmall"
      color="primary"
      numberOfLines={1}
      style={style}>
      {parts.map((part, i) => (
        <AppText
          key={i}
          color={part.hl ? 'accent' : 'primary'}
          style={part.hl ? {fontWeight: '600'} : undefined}>
          {part.t}
        </AppText>
      ))}
    </AppText>
  );
};
