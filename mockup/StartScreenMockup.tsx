/* ═══════════════════════════════════════════════════════
   StartScreenMockup  ·  Simba / SIMBA Mobile
   Mirror of Avalonia StartPage.axaml
   ═══════════════════════════════════════════════════════ */

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { colors, typography, spacing, radius, shadows, sizes } from './theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = 160
const THUMB_WIDTH = 136
const THUMB_HEIGHT = 85

// ── Mock data ──────────────────────────────────────
const recentItems = [
  {
    id: '1',
    title: 'The Grand Budapest Hotel',
    ext: '.mkv',
    isVideo: true,
    lastOpened: '2h ago',
    duration: '01:39',
  },
  {
    id: '2',
    title: 'Bohemian Rhapsody (Live Aid)',
    ext: '.mp4',
    isVideo: true,
    lastOpened: 'Yesterday',
    duration: '00:21',
  },
  {
    id: '3',
    title: 'Ambient Study Mix',
    ext: '.flac',
    isVideo: false,
    lastOpened: 'Yesterday',
    duration: '2:14:30',
  },
  {
    id: '4',
    title: 'Interstellar — Main Theme',
    ext: '.flac',
    isVideo: false,
    lastOpened: '3d ago',
    duration: '10:23',
  },
  {
    id: '5',
    title: 'Dune (2021)',
    ext: '.mp4',
    isVideo: true,
    lastOpened: '5d ago',
    duration: '02:35',
  },
]

// ── Component ──────────────────────────────────────
export default function StartScreenMockup() {
  return (
    <View style={styles.root}>
      {/* ══ BACKGROUND LAYERS ══ */}
      <View style={styles.bgBase} />
      <View style={styles.bgWarmGlow} />
      <View style={styles.bgCoolGlow} />
      <View style={styles.vignette} />
      <View style={styles.topSheen} />
      <View style={styles.glowOrb} />

      {/* ══ STATUS BAR (placeholder) ══ */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>9:41</Text>
      </View>

      {/* ══ MAIN CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand Section ── */}
        <View style={styles.brandSection}>
          {/* Logo circle */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🦁</Text>
            </View>
          </View>

          {/* Wordmark */}
          <Text style={styles.wordmark}>SIMBA</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>Play anything.</Text>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.btnPrimary]} activeOpacity={0.8}>
            <View style={styles.btnContent}>
              <Text style={styles.btnIconPrimary}>▶</Text>
              <Text style={styles.btnLabelPrimary}>Open Media</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.btnSecondary]} activeOpacity={0.8}>
            <View style={styles.btnContent}>
              <Text style={styles.btnIconSecondary}>📂</Text>
              <Text style={styles.btnLabelSecondary}>Open Folder</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Recent Section ── */}
        <View style={styles.recentSection}>
          {/* Header */}
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>RECENT</Text>
            <View style={styles.recentCount}>
              <Text style={styles.recentCountText}>{recentItems.length}</Text>
            </View>
          </View>

          {/* Horizontal card track */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardTrack}
            snapToInterval={CARD_WIDTH + 10}
            decelerationRate="fast"
          >
            {recentItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.recentCard} activeOpacity={0.85}>
                {/* Thumbnail */}
                <View style={styles.thumbContainer}>
                  {/* Fallback gradient */}
                  <View style={styles.thumbFallback} />

                  {/* Dim overlay */}
                  <View style={styles.thumbDim} />

                  {/* Type icon */}
                  <View style={styles.thumbIconWrap}>
                    <Text style={styles.thumbIcon}>
                      {item.isVideo ? '▶' : '♫'}
                    </Text>
                  </View>

                  {/* Timestamp badge */}
                  {item.lastOpened && (
                    <View style={styles.badgeTimestamp}>
                      <Text style={styles.badgeTimestampText}>{item.lastOpened}</Text>
                    </View>
                  )}

                  {/* Continue button (simulate first item having resume) */}
                  {item.id === '1' && (
                    <View style={styles.continueBadge}>
                      <Text style={styles.continueIcon}>▶</Text>
                      <Text style={styles.continueLabel}>Continue</Text>
                    </View>
                  )}
                </View>

                {/* Title */}
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                {/* Meta row */}
                <View style={styles.cardMeta}>
                  <View style={[styles.metaChip, item.isVideo ? styles.metaChipDefault : styles.metaChipAudio]}>
                    <Text style={styles.metaChipText}>
                      {item.isVideo ? 'Video' : 'Audio'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.metaChipExt,
                      item.isVideo ? styles.metaChipBronze : styles.metaChipTeal,
                    ]}
                  >
                    <Text style={styles.metaChipText}>{item.ext}</Text>
                  </View>
                  {item.duration && (
                    <View style={styles.metaChipDuration}>
                      <Text style={styles.metaChipText}>{item.duration}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ══ KEYBOARD HINT (bottom) ══ */}
      <View style={styles.kbdHint}>
        <View style={styles.kbdKey}>
          <Text style={styles.kbdKeyText}>Ctrl</Text>
        </View>
        <Text style={styles.kbdPlus}>+</Text>
        <View style={styles.kbdKey}>
          <Text style={styles.kbdKeyText}>O</Text>
        </View>
        <Text style={styles.kbdLabel}>to open</Text>
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },

  // ── Background layers ──
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgPrimary,
  },
  bgWarmGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.warmGlow,
    opacity: 0.5,
  },
  bgCoolGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.coolGlow,
    opacity: 0.3,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201,169,110,0.08)',
  },

  // ── Status bar ──
  statusBar: {
    paddingTop: 12,
    paddingHorizontal: spacing.xl,
    paddingBottom: 4,
    alignItems: 'center',
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // ── Scroll content ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing['3xl'],
    paddingBottom: 80,
  },

  // ── Brand ──
  brandSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: spacing.lg,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 32,
  },
  wordmark: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body2,
    color: colors.textHint,
  },

  // ── Buttons ──
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing['2xl'],
  },
  actionBtn: {
    flex: 1,
    maxWidth: 180,
    height: 42,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
  },
  btnPrimary: {
    backgroundColor: colors.glassBg,
    borderColor: colors.accentBorder,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderColor: colors.glassBorder,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnIconPrimary: {
    fontSize: 14,
    color: colors.accentLight,
  },
  btnLabelPrimary: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  btnIconSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  btnLabelSecondary: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // ── Recent Section ──
  recentSection: {
    marginTop: spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  recentTitle: {
    ...typography.overline,
    color: colors.sectionHeader,
    letterSpacing: 1.5,
  },
  recentCount: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.hoverSubtle,
    borderWidth: 0.5,
    borderColor: colors.glassBorder,
  },
  recentCountText: {
    ...typography.small,
    color: colors.textHint,
  },

  // ── Cards ──
  cardTrack: {
    gap: 10,
    paddingBottom: spacing.md,
  },
  recentCard: {
    width: CARD_WIDTH,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.cardGlassBg,
    borderWidth: 0.5,
    borderColor: colors.cardGlassBorder,
  },
  thumbContainer: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  thumbFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  thumbDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  thumbIconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.65)',
  },
  badgeTimestamp: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    backgroundColor: colors.badgeBg,
  },
  badgeTimestampText: {
    ...typography.small,
    color: colors.badgeText,
  },
  continueBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -12 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(20,20,22,0.80)',
  },
  continueIcon: {
    fontSize: 10,
    color: '#FFF',
  },
  continueLabel: {
    ...typography.small,
    fontWeight: '600',
    color: '#FFF',
  },
  cardTitle: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  metaChipDefault: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  metaChipAudio: {
    backgroundColor: 'rgba(110,201,169,0.10)',
  },
  metaChipExt: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  metaChipBronze: {
    backgroundColor: 'rgba(201,169,110,0.10)',
  },
  metaChipTeal: {
    backgroundColor: 'rgba(110,201,169,0.10)',
  },
  metaChipDuration: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(16,16,18,0.08)',
  },
  metaChipText: {
    ...typography.small,
    color: colors.textHint,
    fontSize: 8.5,
  },

  // ── Keyboard Hint ──
  kbdHint: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.hoverSubtle,
    borderWidth: 0.5,
    borderColor: colors.glassBorder,
  },
  kbdKey: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  kbdKeyText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  kbdPlus: {
    ...typography.small,
    color: colors.textSecondary,
  },
  kbdLabel: {
    ...typography.small,
    color: colors.textHint,
  },
})
