import {TextStyle} from 'react-native';

export const typography: Record<string, TextStyle> = {
  h1: {fontSize: 32, fontWeight: '700', lineHeight: 40},
  h2: {fontSize: 28, fontWeight: '700', lineHeight: 36},
  h3: {fontSize: 24, fontWeight: '600', lineHeight: 32},
  h4: {fontSize: 20, fontWeight: '600', lineHeight: 28},
  body1: {fontSize: 16, fontWeight: '400', lineHeight: 24},
  body2: {fontSize: 14, fontWeight: '400', lineHeight: 20},
  caption: {fontSize: 12, fontWeight: '400', lineHeight: 16},
  button: {fontSize: 16, fontWeight: '600', lineHeight: 24},
  label: {fontSize: 12, fontWeight: '500', lineHeight: 16},

  // ── New: Mockup-aligned variants ──
  display: {fontSize: 30, fontWeight: '700', letterSpacing: 6, lineHeight: 40},
  overline: {fontSize: 10, fontWeight: '600', letterSpacing: 1, lineHeight: 14},
  small: {fontSize: 9, fontWeight: '500', letterSpacing: 0.3, lineHeight: 12},
  time: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
};
