import { Platform, TextStyle } from 'react-native';

/** Soft rounded display + clean body — avoids Inter/system defaults where possible */
const displayFont = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-medium',
  default: 'Avenir Next, Segoe UI, sans-serif',
});

const bodyFont = Platform.select({
  ios: 'Avenir',
  android: 'sans-serif',
  default: 'Avenir, Segoe UI, sans-serif',
});

export const typography = {
  hero: {
    fontFamily: displayFont,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
  } satisfies TextStyle,
  display: {
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  } satisfies TextStyle,
  title: {
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  } satisfies TextStyle,
  body: {
    fontFamily: bodyFont,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,
  caption: {
    fontFamily: bodyFont,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  } satisfies TextStyle,
  label: {
    fontFamily: displayFont,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.15,
  } satisfies TextStyle,
  tiny: {
    fontFamily: bodyFont,
    fontSize: 12,
    fontWeight: '500',
  } satisfies TextStyle,
} as const;
