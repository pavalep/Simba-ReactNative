/**
 * Audio Settings screen — output, enhancements, EQ, and advanced configuration.
 */
const textContent = {
  headerTitle: 'Audio Settings',
  sectionOutput: 'Output',
  sectionEnhancements: 'Enhancements',
  sectionEqualizer: 'Equalizer',
  sectionAdvanced: 'Advanced',
  audioDevice: 'Audio Device',
  audioDeviceDesc: 'Select audio output device',
  sampleRate: 'Sample Rate',
  sampleRateDesc: 'Select audio sample rate',
  normalizeVolume: 'Normalize Volume',
  normalizeVolumeDesc: 'Automatically normalize audio volume',
  dialogueBoost: 'Dialogue Boost',
  replayGain: 'ReplayGain',
  replayGainDesc: 'Select ReplayGain mode',
  enableEQ: 'Enable EQ',
  eqPreset: 'Preset',
  eqPresetDesc: 'Select equalizer preset',
  gaplessPlayback: 'Gapless Playback',
  audioDelay: 'Audio Delay',
  audioDelayDesc: 'Select audio delay',
  audioDevices: ['Auto', 'Speaker', 'Headphones', 'Bluetooth'],
  sampleRates: ['44.1kHz', '48kHz', '96kHz', '192kHz'],
  replayGainOptions: ['Off', 'Track', 'Album'],
  eqPresets: ['Flat', 'Rock', 'Pop', 'Jazz', 'Classical', 'Dance'],
  audioDelays: ['0ms', '-100ms', '+100ms', '-250ms', '+250ms'],
  cancel: 'Cancel',
} as const;

export default textContent;
