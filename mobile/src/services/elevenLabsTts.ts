import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { env } from '../config/env';
import { arrayBufferToBase64 } from './audioEncoding';
import { humanizeError, logger } from './logger';
import { getVoiceForLanguage } from './voiceService';
import type { SupportedLanguage } from '../types';

let activePlayer: AudioPlayer | null = null;
let activeUri: string | null = null;

export function stopElevenLabsSpeech(): void {
  if (activePlayer) {
    try {
      activePlayer.pause();
      activePlayer.remove();
    } catch {
      // ignore
    }
    activePlayer = null;
  }
  if (activeUri) {
    void FileSystem.deleteAsync(activeUri, { idempotent: true });
    activeUri = null;
  }
}

/** Play TTS via ElevenLabs using the language-matched voice (not system speech). */
export async function speakWithElevenLabs(
  text: string,
  language: SupportedLanguage,
  onDone?: () => void,
): Promise<void> {
  stopElevenLabsSpeech();

  if (!env.elevenLabs.hasApiKey) {
    logger.warn('elevenLabsTts', 'No API key — skipping TTS');
    onDone?.();
    return;
  }

  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    });

    const { voiceId } = await getVoiceForLanguage(language);
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': env.elevenLabs.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`TTS ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new Error('Empty TTS response');

    const base64 = arrayBufferToBase64(buffer);
    activeUri = `${FileSystem.cacheDirectory}nobi-tts-${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(activeUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    activePlayer = createAudioPlayer({ uri: activeUri }, { updateInterval: 100 });
    activePlayer.play();

    await new Promise<void>((resolve, reject) => {
      const sub = activePlayer!.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (!status.isLoaded) {
          if (status.error) {
            sub.remove();
            reject(new Error(status.error));
          }
          return;
        }
        if (status.didJustFinish) {
          sub.remove();
          resolve();
        }
      });
    });
  } catch (err) {
    logger.warn('elevenLabsTts', humanizeError(err, 'TTS failed'));
  } finally {
    stopElevenLabsSpeech();
    onDone?.();
  }
}
