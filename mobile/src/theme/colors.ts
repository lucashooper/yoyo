export const colors = {
  background: '#F9FAFC',
  backgroundWarm: '#FFF8F3',
  surface: '#FFFFFF',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  accent: '#FF7675',
  accentSoft: '#FFEAA7',
  mint: '#55EFC4',
  text: '#2D3436',
  textMuted: '#636E72',
  textLight: '#B2BEC3',
  border: '#E8ECF0',
  streak: '#FF9F43',
  blobBody: '#B8A9FF',
  blobHighlight: '#D4CCFF',
  blobCheek: '#FFB4B4',
  success: '#00B894',
  correction: '#FFF3E0',
  correctionBorder: '#FFB74D',
} as const;

export type ColorKey = keyof typeof colors;
