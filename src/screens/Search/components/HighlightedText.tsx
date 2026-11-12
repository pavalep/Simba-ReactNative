// ─── HighlightedText ─────────────────────────────────────────────────────
// The matched part of a result's title or description is drawn in the
// accent colour.
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN): two defects fixed here.
//
// 1. THE SIZE JUMPED WITH THE QUERY. With a query the title was drawn as
//    `bodySmall` (Inter 14/20) and without one as `body2` (Inter 15/22) —
//    so a result's title changed size as the user typed. It is always
//    `body2` now.
//
// 2. THE HIGHLIGHT WAS NOT REALLY SEMIBOLD. `fontWeight: '600'` on the
//    family `Inter` asks Android for `fonts/Inter.ttf` (the rule in
//    `constants/fontFamily.ts` drops the suffix below weight 700), so
//    `Inter SemiBold.ttf` — which DOES ship — was unreachable and the
//    matched text was drawn in REGULAR, just tinted. The weight now lives
//    in the family key.

import React from 'react';
import {type StyleProp, type TextStyle} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {FONT_FAMILY} from '../../../constants/fontFamily';

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
  const isSubtitle = variant === 'subtitle';

  if (!query || !text) {
    return isSubtitle ? (
      <AppText variant="caption" color="tertiary" numberOfLines={1}>
        {text}
      </AppText>
    ) : (
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
    return isSubtitle ? (
      <AppText variant="caption" color="tertiary" numberOfLines={1}>
        {text}
      </AppText>
    ) : (
      <AppText variant="body2" color="primary" numberOfLines={1} style={style}>
        {text}
      </AppText>
    );
  }

  const highlightFamily = isSubtitle
    ? FONT_FAMILY.inter.medium
    : FONT_FAMILY.inter.semibold;

  const rendered = parts.map((part, i) => (
    <AppText
      key={i}
      color={part.hl ? 'accent' : isSubtitle ? 'tertiary' : 'primary'}
      style={part.hl ? {fontFamily: highlightFamily} : undefined}>
      {part.t}
    </AppText>
  ));

  if (isSubtitle) {
    return (
      <AppText variant="caption" color="tertiary" numberOfLines={1}>
        {rendered}
      </AppText>
    );
  }

  return (
    <AppText variant="body2" color="primary" numberOfLines={1} style={style}>
      {rendered}
    </AppText>
  );
};
