import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────

export interface SubtitleSettings {
  fontSize: 'small' | 'medium' | 'large';
  opacity: number;
  position: number;
  textColor: string;
  bgOpacity: number;
}

// ─── Constants ────────────────────────────────────────────────

const STORAGE_KEY = 'simba_subtitle_settings';

const DEFAULTS: SubtitleSettings = {
  fontSize: 'medium',
  opacity: 1,
  position: 90,
  textColor: '#FFFFFF',
  bgOpacity: 0.5,
};

// ─── Load ─────────────────────────────────────────────────────

export async function loadSubtitleSettings(): Promise<SubtitleSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULTS;
    }
    const parsed = JSON.parse(raw) as Partial<SubtitleSettings>;
    return {...DEFAULTS, ...parsed};
  } catch {
    return DEFAULTS;
  }
}

// ─── Save (partial merge) ─────────────────────────────────────

export async function saveSubtitleSettings(
  settings: Partial<SubtitleSettings>,
): Promise<void> {
  try {
    const existing = await loadSubtitleSettings();
    const merged = {...existing, ...settings};
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // silently fail — settings are not critical
  }
}
