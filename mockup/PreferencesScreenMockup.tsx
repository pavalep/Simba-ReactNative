/* ═══════════════════════════════════════════════════════
   PreferencesScreenMockup  ·  Cine / SIMBA Mobile
   Mirror of Avalonia PreferencesDialog.axaml
   ═══════════════════════════════════════════════════════ */

import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native'
import { colors, typography, spacing, radius, shadows } from './theme'

// ── Mock data ──────────────────────────────────────
const featureStatuses = [
  { name: 'Hardware Acceleration', status: '✓ Active' },
  { name: 'Audio Normalization', status: '✓ Active' },
  { name: 'Dialogue Boost', status: '✦ Available' },
  { name: 'Subtitles', status: '✓ Active' },
]

const shortcuts = [
  { key: 'Space', action: 'Play / Pause' },
  { key: 'F / F11', action: 'Toggle Fullscreen' },
  { key: '← / →', action: 'Seek ±5s' },
  { key: 'Ctrl+← / Ctrl+→', action: 'Prev/Next Chapter' },
  { key: 'Shift+← / Shift+→', action: 'Seek ±30s' },
  { key: '↑ / ↓', action: 'Volume ±5%' },
  { key: 'M', action: 'Mute Toggle' },
  { key: 'C', action: 'Cycle Subtitles' },
  { key: 'Esc', action: 'Exit Fullscreen' },
  { key: 'Ctrl+O', action: 'Open File' },
  { key: 'Ctrl+P', action: 'Playlist' },
  { key: 'Ctrl+Shift+E', action: 'Equalizer' },
]

// ── Reusable section components ────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

function SettingRow({
  label,
  description,
  toggle = false,
  value = false,
}: {
  label: string
  description?: string
  toggle?: boolean
  value?: boolean
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && (
          <Text style={styles.settingDesc}>{description}</Text>
        )}
      </View>
      {toggle && (
        <View
          style={[
            styles.toggleTrack,
            value && styles.toggleTrackActive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              value && styles.toggleThumbActive,
            ]}
          />
        </View>
      )}
    </View>
  )
}

// ── Component ──────────────────────────────────────
export default function PreferencesScreenMockup() {
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Preferences</Text>
        <TouchableOpacity style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ License & Features ══ */}
        <SectionHeader label="License &amp; Features" />
        <Card>
          <View style={styles.licenseRow}>
            <View>
              <Text style={styles.settingLabel}>License Tier</Text>
              <Text style={styles.settingDesc}>Unlimited License</Text>
            </View>
            <Text style={styles.licenseValue}>Pro</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.featureSubheader}>FEATURE STATUS</Text>
          {featureStatuses.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>
                {f.status.startsWith('✓') ? '✅' : '✦'}
              </Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>{f.name}</Text>
                <Text style={styles.featureReason}>{f.status}</Text>
              </View>
              <Text style={styles.featureStatus}>{f.status}</Text>
            </View>
          ))}
        </Card>

        {/* ══ General ══ */}
        <SectionHeader label="General" />
        <Card>
          <SettingRow
            label="Audio Normalization"
            description="Dynamic range compression for consistent volume"
            toggle
            value
          />
          <View style={styles.divider} />
          <SettingRow
            label="Dialogue Boost"
            description="Enhance speech clarity using spectral compression"
            toggle
            value={false}
          />
        </Card>

        {/* ══ Rendering ══ */}
        <SectionHeader label="Rendering" />
        <Card>
          <SettingRow
            label="Hardware Acceleration"
            description="Use GPU for video decoding and rendering"
            toggle
            value
          />
        </Card>

        {/* ══ Subtitles ══ */}
        <SectionHeader label="Subtitles" />
        <Card>
          <SettingRow
            label="Auto-load External Subtitles"
            description="Scan for .srt / .ass in media directory"
            toggle
            value
          />

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Languages</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputText}>eng, jpn, und</Text>
            </View>
            <Text style={styles.inputHint}>
              Comma-separated language codes. First match is auto-selected.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              External Subtitle Directories
            </Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputText}>./subs, ./subtitles</Text>
            </View>
            <Text style={styles.inputHint}>
              Relative to media file directory. Comma-separated.
            </Text>
          </View>
        </Card>

        {/* ══ Keyboard Shortcuts ══ */}
        <SectionHeader label="Keyboard Shortcuts" />
        <Card>
          {shortcuts.map((s, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.shortcutDivider} />}
              <View style={styles.shortcutRow}>
                <Text style={styles.shortcutKey}>{s.key}</Text>
                <Text style={styles.shortcutAction}>{s.action}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>
              View All Shortcuts (Ctrl+/)
            </Text>
          </TouchableOpacity>
        </Card>

        {/* ══ About ══ */}
        <SectionHeader label="About" />
        <Card>
          <View style={styles.aboutSection}>
            {/* Logo */}
            <View style={styles.aboutLogo}>
              <Text style={styles.aboutLogoIcon}>▶</Text>
            </View>
            <Text style={styles.aboutAppName}>Cine Media Player</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutBuilt}>Built with Avalonia UI &amp; libmpv</Text>
          </View>
        </Card>

        {/* Footer spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBorder} />
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.footerBtnDestructive}>
            <Text style={styles.footerBtnDestructiveText}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtnPrimary}>
            <Text style={styles.footerBtnPrimaryText}>Close</Text>
          </TouchableOpacity>
        </View>
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    ...typography.subtitle1,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // ── Section ──
  sectionHeader: {
    ...typography.overline,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    marginTop: spacing['2xl'],
    letterSpacing: 1.2,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.popoverBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.popoverBorder,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: colors.popoverBorder,
    marginVertical: spacing.md,
  },

  // ── License Row ──
  licenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  licenseValue: {
    ...typography.body2,
    color: colors.textPrimary,
  },
  featureSubheader: {
    ...typography.overline,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
    gap: spacing.sm,
  },
  featureIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  featureReason: {
    ...typography.small,
    color: colors.textTertiary,
  },
  featureStatus: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // ── Setting Row ──
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body2,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  settingDesc: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // ── Toggle ──
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: colors.accentDim,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textHint,
  },
  toggleThumbActive: {
    backgroundColor: colors.accentLight,
    alignSelf: 'flex-end',
  },

  // ── Input ──
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  inputBox: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgPrimary,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.popoverBorder,
  },
  inputText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  inputHint: {
    ...typography.small,
    color: colors.textTertiary,
  },

  // ── Keyboard Shortcuts ──
  shortcutDivider: {
    height: 1,
    backgroundColor: colors.popoverBorder,
    opacity: 0.5,
  },
  shortcutRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  shortcutKey: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 120,
  },
  shortcutAction: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  viewAllBtn: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  viewAllText: {
    ...typography.body2,
    color: colors.accentLight,
    fontWeight: '500',
  },

  // ── About ──
  aboutSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  aboutLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.hoverSubtle,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLogoIcon: {
    fontSize: 20,
    color: colors.osdForeground,
    marginLeft: 2,
  },
  aboutAppName: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.osdForeground,
  },
  aboutVersion: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  aboutBuilt: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 24,
  },
  footerBorder: {
    height: 1,
    backgroundColor: colors.popoverBorder,
    marginBottom: spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  footerBtnDestructive: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDim,
  },
  footerBtnDestructiveText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footerBtnPrimary: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  footerBtnPrimaryText: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '600',
  },
})
