/* ═══════════════════════════════════════════════════════
   PlayerScreenMockup  ·  Simba / SIMBA Mobile
   Mirror of Avalonia PlayerPage.axaml + ControlsBox + HeaderBar + SeekBar
   ═══════════════════════════════════════════════════════ */

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { colors, typography, spacing, radius, shadows, sizes } from './theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// ── Mock playback state ────────────────────────────
const MOCK_POSITION = 0.35 // 35% through
const MOCK_CURRENT = '21:47'
const MOCK_DURATION = '1:02:14'

// ── Component ──────────────────────────────────────
export default function PlayerScreenMockup() {
  const [controlsVisible, setControlsVisible] = useState(true)

  const toggleControls = () => setControlsVisible((p) => !p)

  return (
    <View style={styles.root}>
      {/* ═══ VIDEO SURFACE ═══ */}
      <TouchableOpacity
        style={styles.videoSurface}
        activeOpacity={1}
        onPress={toggleControls}
      >
        {/* Video background */}
        <View style={styles.videoBg} />

        {/* Center play/pause icon (shown briefly on tap) */}
        {!controlsVisible && (
          <View style={styles.centerPlayIcon}>
            <Text style={styles.centerPlayText}>▶</Text>
          </View>
        )}

        {/* Loading spinner area */}
        <View style={styles.spinnerArea}>
          <View style={styles.spinner} />
        </View>
      </TouchableOpacity>

      {/* ═══ HEADER BAR (glass, top) ═══ */}
      {controlsVisible && (
        <View style={styles.headerBar}>
          {/* Glass edge highlight */}
          <View style={styles.headerEdge} />

          {/* Header content */}
          <View style={styles.headerContent}>
            {/* Left: Back + Open */}
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.headerBtn}>
                <Text style={styles.headerBtnIcon}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.openBtn}>
                <Text style={styles.openBtnLabel}>Open</Text>
                <Text style={styles.openBtnArrow}>▾</Text>
              </TouchableOpacity>
            </View>

            {/* Center: Title */}
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                The Grand Budapest Hotel
              </Text>
            </View>

            {/* Right: PiP + Menu + Window controls */}
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerBtn}>
                <Text style={styles.headerBtnIcon}>⊞</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn}>
                <Text style={styles.headerBtnIcon}>⋯</Text>
              </TouchableOpacity>
              <View style={styles.windowCtrls}>
                <TouchableOpacity style={styles.winCtrl}>
                  <Text style={styles.winCtrlIcon}>─</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.winCtrl}>
                  <Text style={styles.winCtrlIcon}>□</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.winCtrl, styles.winClose]}>
                  <Text style={styles.winCtrlIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ═══ CONTROLS BOX (glass, bottom) ═══ */}
      {controlsVisible && (
        <View style={styles.controlsBox}>
          {/* Glass edge highlight */}
          <View style={styles.controlsEdge} />

          {/* Sheen gradient */}
          <View style={styles.controlsSheen} />

          {/* ── Row: Seek bar + time ── */}
          <View style={styles.seekRow}>
            {/* Seek track */}
            <View style={styles.seekArea}>
              {/* Background track */}
              <View style={styles.seekTrack} />
              {/* Fill */}
              <View
                style={[
                  styles.seekFill,
                  { width: `${MOCK_POSITION * 100}%` },
                ]}
              />
              {/* Thumb */}
              <View
                style={[
                  styles.seekThumb,
                  { left: `${MOCK_POSITION * 100}%` },
                ]}
              />
              {/* Chapter markers */}
              {[0.15, 0.3, 0.55, 0.72, 0.88].map((pct, i) => (
                <View
                  key={i}
                  style={[styles.chapterMarker, { left: `${pct * 100}%` }]}
                />
              ))}
            </View>

            {/* Time labels */}
            <Text style={styles.timeLabel}>{MOCK_CURRENT}</Text>
            <View style={styles.timeSep} />
            <Text style={styles.timeLabel}>{MOCK_DURATION}</Text>
          </View>

          {/* ── Row: Transport buttons ── */}
          <View style={styles.transportRow}>
            {/* Group 1: Previous / Play-Pause / Next */}
            <View style={styles.btnGroup}>
              <TouchableOpacity style={styles.transportBtn}>
                <Text style={styles.transportIcon}>⏮</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn}>
                <View style={styles.playBtnInner}>
                  <Text style={styles.playIcon}>▶</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.transportBtn}>
                <Text style={styles.transportIcon}>⏭</Text>
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Group 2: Volume + Equalizer */}
            <View style={styles.btnGroup}>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>🔊</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>⚙</Text>
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Group 3: Shuffle + Loop + Playlist */}
            <View style={styles.btnGroup}>
              <TouchableOpacity style={[styles.menuBtn, styles.toggleActive]}>
                <Text style={styles.menuIcon}>🔀</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>🔁</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Group 4: Chapters + Subtitles + Audio + Fullscreen */}
            <View style={styles.btnGroup}>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>🔖</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>CC</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>🎵</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn}>
                <Text style={styles.menuIcon}>⛶</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ═══ TRIAL WATERMARK ═══ */}
      <View style={styles.trialWatermark} pointerEvents="none">
        <Text style={styles.trialText}>TRIAL</Text>
      </View>

      {/* ═══ OSD NOTIFICATION (bottom center) ═══ */}
      <View style={styles.osdNotification}>
        <Text style={styles.osdText}>Volume: 65%</Text>
      </View>

      {/* ═══ NOW PLAYING INFO (bottom right) ═══ */}
      <View style={styles.nowPlaying}>
        <Text style={styles.nowPlayingTitle}>The Grand Budapest Hotel</Text>
        <Text style={styles.nowPlayingSub}>1080p · H.264 · 5.1 AAC</Text>
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Video surface ──
  videoSurface: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#060608',
  },
  centerPlayIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayText: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  spinnerArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -16,
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopColor: colors.accent,
  },

  // ── Header Bar ──
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: sizes.headerBar + 36, // include status bar area
    backgroundColor: colors.glassBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDim,
    zIndex: 20,
  },
  headerEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.glassEdge,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 36, // status bar height
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnIcon: {
    fontSize: 16,
    color: colors.osdForeground,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    height: 28,
    borderRadius: radius.sm,
  },
  openBtnLabel: {
    ...typography.body2,
    color: colors.osdForeground,
  },
  openBtnArrow: {
    fontSize: 10,
    color: colors.osdForeground,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    ...typography.subtitle2,
    color: colors.osdForeground,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  windowCtrls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  winCtrl: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  winCtrlIcon: {
    fontSize: 12,
    color: colors.osdForeground,
  },
  winClose: {
    backgroundColor: 'transparent',
  },

  // ── Controls Box ──
  controlsBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.glassBg,
    borderTopWidth: 1,
    borderTopColor: colors.borderDim,
    paddingBottom: 24, // safe area
    zIndex: 15,
  },
  controlsEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.glassEdge,
  },
  controlsSheen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.glassSheenStart,
    opacity: 0.3,
  },

  // ── Seek bar ──
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  seekArea: {
    flex: 1,
    height: sizes.seekBarHeight,
    justifyContent: 'center',
    position: 'relative',
  },
  seekTrack: {
    height: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.seekTrack,
  },
  seekFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.seekFill,
  },
  seekThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.seekThumb,
    borderWidth: 1.5,
    borderColor: colors.seekThumbBorder,
    marginLeft: -7,
    top: '50%',
    marginTop: -7,
  },
  chapterMarker: {
    position: 'absolute',
    width: 3,
    height: 12,
    backgroundColor: colors.osdForeground,
    opacity: 0.5,
    top: '50%',
    marginTop: -6,
    marginLeft: -1.5,
    borderRadius: 1,
  },
  timeLabel: {
    ...typography.time,
    color: colors.osdForeground,
    minWidth: 40,
    textAlign: 'center',
  },
  timeSep: {
    width: 1,
    height: 14,
    borderRadius: 1,
    backgroundColor: colors.divider,
    opacity: 0.3,
  },

  // ── Transport row ──
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transportBtn: {
    width: sizes.controlBtn,
    height: sizes.controlBtn,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportIcon: {
    fontSize: 18,
    color: colors.osdForeground,
  },
  playBtn: {
    width: sizes.transportBtn,
    height: sizes.transportBtn,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playBtnInner: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 22,
    color: colors.osdForeground,
    marginLeft: 2,
  },
  menuBtn: {
    width: sizes.controlBtn,
    height: sizes.controlBtn,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 14,
    color: colors.osdForeground,
  },
  toggleActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: colors.divider,
  },

  // ── Trial watermark ──
  trialWatermark: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialText: {
    fontSize: 60,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.08)',
    letterSpacing: 12,
  },

  // ── OSD Notification ──
  osdNotification: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderDim,
  },
  osdText: {
    ...typography.caption,
    color: colors.osdForeground,
  },

  // ── Now Playing Info ──
  nowPlaying: {
    position: 'absolute',
    bottom: 130,
    right: spacing.xl,
    alignItems: 'flex-end',
  },
  nowPlayingTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nowPlayingSub: {
    ...typography.small,
    color: colors.textHint,
  },
})
