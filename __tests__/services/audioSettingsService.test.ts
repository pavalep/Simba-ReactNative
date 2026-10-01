// ─── audioSettingsService — mpv property encoding ────────────────────────
//
// `MpvBridgeModule.setProperty(name, value)` declares `value` as a Kotlin
// `String`, and React Native's JS→native marshalling THROWS on a type
// mismatch rather than coercing. A number produced:
//
//   Exception in HostFunction: Expected argument 1 of method
//   "setProperty" to be a string, but got a number (100.000000)
//
// as a red-box that unmounts the whole React tree.
//
// Three of the properties this service pushes are genuinely numeric
// (`volume-max`, `audio-delay`, `audio-samplerate`), so the bug was
// reachable on every audio-settings apply. The service now encodes through
// the lib's shared `toMpvPropertyString`.
//
// The contract these tests pin is deliberately the bridge boundary, not
// the encoder: whatever a caller passes, EVERY value that reaches
// `setProperty` must be a string. The encoder itself is unit-tested in
// the lib (`src/types/__tests__/player.test.tsx`), so duplicating its
// cases here would only test a second copy of the rules.

const mockSetProperty = jest.fn();

jest.mock('../../src/infrastructure/player', () => ({
  getMpvPlayerModule: jest.fn(() => ({
    setProperty: mockSetProperty,
  })),
  // The REAL encoder — spreading the barrel is deliberately avoided; only
  // this one pure symbol is pulled through.
  toMpvPropertyString: jest.requireActual(
    '../../src/infrastructure/player',
  ).toMpvPropertyString,
}));

const mockSettingsState: Record<string, unknown> = {};

jest.mock('../../src/state', () => ({
  useSettingsStore: {
    getState: () => mockSettingsState,
  },
}));

import {logger} from '../../src/lib/logger';
import {
  applyAudioSettingsToMpv,
  applyPlaybackSettingsToMpv,
  buildAfFilter,
} from '../../src/services/audioSettingsService';

/**
 * The real logger is spied rather than module-mocked: it is a class
 * instance, so asserting on its own `warn` method keeps the test honest
 * about the shape the service actually calls. The spy also silences the
 * `console.warn` the real implementation would otherwise emit.
 */
let warnSpy: jest.SpyInstance;

const BASE_SETTINGS = {
  isAudioNormalizationEnabled: false,
  replayGain: 'track',
  gaplessPlayback: true,
  audioDelay: 0,
  sampleRate: 'auto',
  eqEnabled: false,
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  isDialogueBoostEnabled: false,
  isHardwareAccelerationEnabled: true,
  isAutoLoadSubtitlesEnabled: false,
  preferredLanguages: 'en',
};

beforeEach(() => {
  mockSetProperty.mockReset();
  warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  Object.keys(mockSettingsState).forEach(k => delete mockSettingsState[k]);
  Object.assign(mockSettingsState, BASE_SETTINGS);
});

afterEach(() => {
  warnSpy.mockRestore();
});

/** Every (name, value) pair handed to the bridge so far. */
function calls(): Array<[string, unknown]> {
  return mockSetProperty.mock.calls as Array<[string, unknown]>;
}

/** The value sent for one property name, or undefined if never sent. */
function sent(name: string): unknown {
  return calls().find(([n]) => n === name)?.[1];
}

describe('applyAudioSettingsToMpv — bridge encoding', () => {
  it('never sends a non-string to the bridge', () => {
    applyAudioSettingsToMpv();
    expect(calls().length).toBeGreaterThan(0);
    for (const [name, value] of calls()) {
      expect(typeof value).toBe('string');
      expect(name).toEqual(expect.any(String));
    }
  });

  it('encodes the numeric normalisation ceiling', () => {
    // Regression: `volume-max` was `100 | 130` — a number.
    mockSettingsState.isAudioNormalizationEnabled = true;
    applyAudioSettingsToMpv();
    expect(sent('volume-max')).toBe('100');

    mockSettingsState.isAudioNormalizationEnabled = false;
    mockSetProperty.mockReset();
    applyAudioSettingsToMpv();
    expect(sent('volume-max')).toBe('130');
  });

  it('encodes a non-zero audio delay without a decimal point', () => {
    // A fractional delay must keep its fraction — mpv's `audio-delay` is
    // a float — while an integer must not arrive as `0.000000`.
    mockSettingsState.audioDelay = 0;
    applyAudioSettingsToMpv();
    expect(sent('audio-delay')).toBe('0');

    mockSetProperty.mockReset();
    mockSettingsState.audioDelay = -2.5;
    applyAudioSettingsToMpv();
    expect(sent('audio-delay')).toBe('-2.5');
  });

  it('passes a string-valued property through unchanged', () => {
    mockSettingsState.replayGain = 'album';
    applyAudioSettingsToMpv();
    expect(sent('replaygain')).toBe('album');
  });

  it('maps gapless playback to mpv yes/no', () => {
    mockSettingsState.gaplessPlayback = true;
    applyAudioSettingsToMpv();
    expect(sent('gapless-audio')).toBe('yes');

    mockSetProperty.mockReset();
    mockSettingsState.gaplessPlayback = false;
    applyAudioSettingsToMpv();
    expect(sent('gapless-audio')).toBe('no');
  });

  it('pushes the equaliser chain as a single af string', () => {
    mockSettingsState.eqEnabled = true;
    mockSettingsState.eqGains = [0, 5, 0, 0, 0, 0, 0, 0, 0, 0];
    applyAudioSettingsToMpv();
    expect(sent('af')).toBe('equalizer=f=62:t=h:w=1.0:g=5');
  });

  it('clears af when the equaliser is off and nothing else is set', () => {
    // An empty string is mpv's "no filter", NOT a silent no-op — the
    // previous preset must actually be removed.
    applyAudioSettingsToMpv();
    expect(sent('af')).toBe('');
  });
});

describe('applyPlaybackSettingsToMpv — bridge encoding', () => {
  it('sends every property as a string', () => {
    applyPlaybackSettingsToMpv();
    expect(calls().map(([n]) => n)).toEqual([
      'hwdec',
      'sub-auto',
      'slang',
    ]);
    for (const [, value] of calls()) {
      expect(typeof value).toBe('string');
    }
  });

  it('maps hardware acceleration and subtitle autoload to mpv vocab', () => {
    mockSettingsState.isHardwareAccelerationEnabled = true;
    mockSettingsState.isAutoLoadSubtitlesEnabled = true;
    applyPlaybackSettingsToMpv();
    expect(sent('hwdec')).toBe('auto');
    expect(sent('sub-auto')).toBe('fuzzy');
  });
});

describe('applyAudioSettingsToMpv — failure handling', () => {
  it('does not throw when mpv is uninitialised', () => {
    // `setProperty` reaching a dead native ptr must never take the app
    // down — that is the whole reason the guard exists.
    mockSetProperty.mockImplementation(() => {
      throw new Error('native ptr is 0');
    });
    expect(() => applyAudioSettingsToMpv()).not.toThrow();
  });

  it('logs the failing property name instead of swallowing it', () => {
    // Regression: `applyPlaybackSettingsToMpv` used a silent `catch {}`,
    // which is exactly what let a setting quietly fail to apply.
    mockSetProperty.mockImplementation(() => {
      throw new Error('native ptr is 0');
    });
    applyPlaybackSettingsToMpv();
    expect(logger.warn).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][1]).toBe('hwdec');
  });

  it('keeps applying the remaining properties after one fails', () => {
    // One unsupported property must not strand the ones after it.
    mockSetProperty.mockImplementation((name: string) => {
      if (name === 'replaygain') {
        throw new Error('unsupported');
      }
    });
    applyAudioSettingsToMpv();
    expect(sent('audio-delay')).toBe('0');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('buildAfFilter', () => {
  it('omits zero-gain bands and joins the rest', () => {
    const gains = [5, 0, -3, 0, 0, 0, 0, 0, 0, 0];
    expect(buildAfFilter(gains, false)).toBe(
      'equalizer=f=31:t=h:w=1.0:g=5,equalizer=f=125:t=h:w=1.0:g=-3',
    );
  });

  it('returns an empty string when there is nothing to do', () => {
    expect(buildAfFilter([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], false)).toBe('');
  });

  it('appends the dialogue boost filter when asked', () => {
    const withBoost = buildAfFilter([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], true);
    expect(withBoost).toBe('equalizer=f=2500:t=h:w=1.0:g=6');
  });

  it('tolerates a short gains array instead of throwing', () => {
    expect(() => buildAfFilter([], false)).not.toThrow();
    expect(buildAfFilter([], false)).toBe('');
  });
});
