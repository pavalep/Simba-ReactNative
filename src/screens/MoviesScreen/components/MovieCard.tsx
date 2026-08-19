// ─── Movies Screen — MovieCard ───────────────────────────────────────
// Premium 2-col 16:9 hero card (Apple TV+ / Prime Video style):
//
//   ┌───────────────────────────┐
//   │                           │
//   │    full-bleed image       │
//   │                           │
//   │  ── scrim gradient ──     │  ← LinearGradient: transparent →
//   │  Title line               │     scrimOpaque from ~40% down
//   │  year · creator           │
//   └───────────────────────────┘
//
// The image IS the card — no surface, no border, no badges. Metadata
// (rating, duration) deliberately drops OUT here and lives on the
// detail/action sheet. Title + year + creator are the only payload.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, View, TouchableOpacity, type ImageSourcePropType} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {createMovieCardStyles} from '../styles';
import type {InternetArchiveVideoResult} from '../../../types/api';

interface MovieCardProps {
  item: InternetArchiveVideoResult;
  onPress: (item: InternetArchiveVideoResult) => void;
  isResolving?: boolean;
  /** Category cover image — used as a fallback when the IA item has no
   *  `imageUrl` so consecutive empty cards don't render as visual voids. */
  placeholderImage?: ImageSourcePropType;
  /** When true, this card is the sole item in its row (odd item count).
   *  Renders at an explicit 50% width via `heroCardLonely` instead of
   *  `heroCard` (which uses `flex: 1` to claim half the row). Without
   *  this, a single trailing item stretches to full screen width and
   *  looks like a giant banner inside the grid. */
  isLonelyItem?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = React.memo(
  ({item, onPress, isResolving, placeholderImage, isLonelyItem}) => {
    const {colors} = useTheme();
    const styles = useMemo(() => createMovieCardStyles(), []);
    // Local "image failed" state so we can fall back to the placeholder
    // instead of the broken-image icon. `imageUrl` comes from the IA
    // search API with a fallback to `https://archive.org/services/img/{id}`
    // (verified to return a 200 image/jpeg for every item).
    const [imageFailed, setImageFailed] = useState(false);
    // Cross-fade animation: every card starts at the same visual state
    // (cover image underneath) and fades its remote image in once loaded.
    // This makes two adjacent cards with differing load times look
    // consistent — every cell shows the category cover while waiting,
    // so empty cells never collapse to a dark void mid-scroll.
    const imageOpacity = useRef(new Animated.Value(0)).current;
    // Stack of layered images, back to front:
    //   Layer 1  base  — cover image (always) or brand placeholder
    //                    (only if no cover); renders synchronously and
    //                    is what the user sees during load and on error.
    //   Layer 2  remote — present ONLY when the item has an imageUrl AND
    //                    the load hasn't failed yet; opacity 0 → 1 on
    //                    load, covering the base layer.
    const hasRemoteAttempt = !!item.imageUrl;
    const remoteActive = hasRemoteAttempt && !imageFailed;
    const hasCover = !!placeholderImage;
    // Pre-build the meta row string so JSX stays compact + viewable.
    // Both fields optional → render conditionally below.
    const meta =
      item.year && item.creator
        ? `${item.year}  ·  ${item.creator}`
        : item.year ?? item.creator ?? '';

    const handleImageLoad = useCallback(() => {
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 220,
        // opacity animation → safe on native driver
        useNativeDriver: true,
      }).start();
    }, [imageOpacity]);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        disabled={isResolving}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${meta ? `, ${meta}` : ''}`}
        style={isLonelyItem ? styles.heroCardLonely : styles.heroCard}>
        {/* Image layer — two stacked layers.
             Layer 1 (base): always present — category cover if available,
             otherwise the gradient + clapperboard brand placeholder.
             This is what the user sees DURING load and ON error, so
             cells never collapse to a dark void while waiting.
             Layer 2 (remote): renders ON TOP of the base only when an
             item has an imageUrl and the load hasn't failed. Starts at
             opacity 0 and fades to 1 on load, covering the base. */}
        <View style={[styles.heroImageLayer, {backgroundColor: colors.background.primary}]}>
          {hasCover ? (
            <FastImage
              source={placeholderImage as unknown as number}
              style={StyleSheet.absoluteFill}
              resizeMode={FastImage.resizeMode.cover}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <LinearGradient
                pointerEvents="none"
                colors={[
                  'rgba(28, 26, 22, 1)',
                  'rgba(14, 13, 11, 1)',
                  'rgba(0, 0, 0, 1)',
                ]}
                locations={[0, 0.5, 1]}
                style={styles.heroPlaceholderGradient}
              />
              <SvgIcon
                name="clapperboard"
                size={56}
                color={colors.accent.gold}
                style={styles.heroPlaceholderIcon}
              />
            </View>
          )}
          {remoteActive ? (
            <Animated.View
              style={[StyleSheet.absoluteFill, {opacity: imageOpacity}]}>
              <FastImage
                source={{uri: item.imageUrl, priority: FastImage.priority.normal}}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
                onLoad={handleImageLoad}
                onError={() => setImageFailed(true)}
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          ) : null}
          {/* Resolving state — centered spinner over the image. */}
          {isResolving ? (
            <View style={[StyleSheet.absoluteFill, styles.heroResolving]}>
              <ActivityOrb size={36} />
            </View>
          ) : null}
        </View>

        {/* LinearGradient overlay covering the bottom 62% of the card —
            provides guaranteed legibility with a SOFT top edge so the
            image bleeds smoothly into the dark text region. Replaces
            the full-card gradient + solid strip from earlier iterations
            — fewer layers, cleaner fade, single source of truth for
            the overlay region. */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(8, 8, 10, 0)',
            'rgba(8, 8, 10, 0.78)',
            'rgba(8, 8, 10, 0.95)',
          ]}
          locations={[0, 0.5, 1]}
          style={styles.heroOverlayBg}
        />

        {/* Text overlay — bottom-left, breathing room inside the scrim. */}
        <View style={styles.heroOverlay} pointerEvents="none">
          <AppText
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.heroTitle}>
            {item.title}
          </AppText>
          {meta ? (
            <AppText
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.heroMeta}>
              {meta}
            </AppText>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  },
);
