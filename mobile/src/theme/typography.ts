import { TextStyle } from 'react-native';

export const typography = {
  hero: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  } satisfies TextStyle,
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,
  caption: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  } satisfies TextStyle,
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  } satisfies TextStyle,
  tiny: {
    fontSize: 12,
    fontWeight: '500',
  } satisfies TextStyle,
} as const;
