import type { SupportedLanguage } from '../types';
import { speakWithElevenLabs, stopElevenLabsSpeech } from './elevenLabsTts';

export interface SpeechController {
  stop: () => void;
}

export function speakAgentLine(
  text: string,
  language: SupportedLanguage,
  _rate: number,
  _onProgress?: (progress: number) => void,
  onDone?: () => void,
): SpeechController {
  stopElevenLabsSpeech();
  void speakWithElevenLabs(text, language, onDone);
  return { stop: () => stopElevenLabsSpeech() };
}

export function stopAgentSpeech(): void {
  stopElevenLabsSpeech();
}
