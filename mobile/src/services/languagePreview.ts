import type { SupportedLanguage } from '../types';
import { logger } from './logger';
import { speakAgentLine, stopAgentSpeech } from './onboardingSpeech';

const PREVIEW_LINES: Record<SupportedLanguage, string> = {
  spanish: '¡Hola! Soy Nobi. ¿Listo para practicar un poco de español?',
  french: 'Bonjour ! Je suis Nobi. Prêt à pratiquer le français ?',
  english: "Hi! I'm Nobi. Ready for a quick English chat?",
  japanese: 'こんにちは！ノビです。日本語を練習しましょう。',
  german: 'Hallo! Ich bin Nobi. Bereit für etwas Deutsch?',
  russian: 'Привет! Я Nobi. Готов немного попрактиковать русский?',
};

/** Short TTS preview so users hear Nobi when picking a language. */
export function previewLanguageVoice(language: SupportedLanguage): void {
  stopAgentSpeech();
  const line = PREVIEW_LINES[language];
  logger.info('languagePreview', 'Playing preview', { language });
  speakAgentLine(line, language, 1);
}
