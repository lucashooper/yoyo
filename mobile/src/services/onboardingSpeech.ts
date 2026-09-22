import * as Speech from 'expo-speech';
import type { SupportedLanguage } from '../types';

const SPEECH_LOCALES: Record<SupportedLanguage, string> = {
  spanish: 'es-ES',
  french: 'fr-FR',
  english: 'en-US',
  japanese: 'ja-JP',
  german: 'de-DE',
  russian: 'ru-RU',
};

export interface SpeechController {
  stop: () => void;
}

export function speakAgentLine(
  text: string,
  language: SupportedLanguage,
  rate: number,
  onProgress?: (progress: number) => void,
  onDone?: () => void,
): SpeechController {
  Speech.stop();

  const estimatedMs = Math.max(1200, text.length * 55);
  let elapsed = 0;
  const tick = setInterval(() => {
    elapsed += 120;
    onProgress?.(Math.min(1, elapsed / estimatedMs));
  }, 120);

  Speech.speak(text, {
    language: SPEECH_LOCALES[language],
    rate: Math.max(0.5, Math.min(1.5, rate)),
    onStart: () => onProgress?.(0.05),
    onDone: () => {
      clearInterval(tick);
      onProgress?.(1);
      onDone?.();
    },
    onStopped: () => clearInterval(tick),
  });

  return {
    stop: () => {
      clearInterval(tick);
      Speech.stop();
    },
  };
}

export function stopAgentSpeech(): void {
  Speech.stop();
}
