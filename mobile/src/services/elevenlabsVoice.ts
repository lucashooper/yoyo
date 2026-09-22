import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioRecorder,
  type AudioStatus,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import type { GrammarCorrection, SupportedLanguage, TranscriptEntry, VoiceSessionState } from '../types';
import { arrayBufferToBase64, decodeBase64ToArrayBuffer } from './audioEncoding';
import { detectCorrection } from './corrections';
import { humanizeError, logger } from './logger';
import { env } from '../config/env';
import { getVoiceForLanguage } from './voiceService';

export const isElevenLabsAgentConfigured = env.elevenLabs.isAgentMode;
export const isElevenLabsTtsConfigured = env.elevenLabs.isTtsMode;
export const isElevenLabsConfigured = isElevenLabsAgentConfigured;

/** Strict VAD — ignore ambient noise / phantom spikes */
const VAD_SPEECH_THRESHOLD = 0.22;
const VAD_MIN_SPEECH_MS = 280;
const VAD_SILENCE_MS = 750;
const VAD_COOLDOWN_AFTER_TTS_MS = 900;

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const MOCK_RESPONSES: Record<SupportedLanguage, string[]> = {
  spanish: [
    '¡Hola! Me alegra practicar contigo. ¿Qué te gustaría pedir en la cafetería?',
    'Muy bien. Recuerda decir "Me gustaría un café, por favor."',
  ],
  french: [
    'Bonjour ! Ravi de vous parler. Que souhaitez-vous commander ?',
    "Très bien. N'oubliez pas de dire « Je voudrais un café, s'il vous plaît. »",
  ],
  english: [
    "Hi there! Great to chat with you. What would you like to practice today?",
    'Nice try! You could say: "I would like a coffee, please."',
  ],
  japanese: [
    'こんにちは！一緒に練習しましょう。何を注文したいですか？',
    'いいですね！「コーヒーをお願いします」と言ってみてください。',
  ],
  german: [
    'Hallo! Schön, mit dir zu üben. Was möchtest du bestellen?',
    'Sehr gut! Sag: „Ich hätte gern einen Kaffee, bitte."',
  ],
  russian: [
    'Привет! Рад практиковаться с тобой. Что ты хотел бы заказать в кафе?',
    'Отлично! Попробуй сказать: «Я хотел бы кофе, пожалуйста.»',
  ],
};

export interface VoiceSessionCallbacks {
  onStateChange: (state: VoiceSessionState) => void;
  onAmplitude: (level: number) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onCorrection: (correction: GrammarCorrection) => void;
  onError: (message: string) => void;
  onPlaybackProgress?: (progress: number) => void;
}

export class ElevenLabsVoiceService {
  private ws: WebSocket | null = null;
  private recorder: AudioRecorder | null = null;
  private player: AudioPlayer | null = null;
  private callbacks: VoiceSessionCallbacks;
  private language: SupportedLanguage;
  private scenarioPrompt: string;
  private active = false;
  private mockTurn = 0;
  private lastSpeechAt = 0;
  private speechStartedAt: number | null = null;
  private vadTimer: ReturnType<typeof setTimeout> | null = null;
  private meteringInterval: ReturnType<typeof setInterval> | null = null;
  private voiceId: string | null = null;
  private ttsMode = false;
  private speakAmplitudeTimer: ReturnType<typeof setInterval> | null = null;
  private isPlayingAudio = false;
  private playbackGateUntil = 0;
  private lastUserTranscript = '';
  private lastUserTranscriptAt = 0;
  private hasDetectedUserSpeech = false;
  private mockPending = false;
  private sessionState: VoiceSessionState = 'idle';

  constructor(
    language: SupportedLanguage,
    scenarioPrompt: string,
    callbacks: VoiceSessionCallbacks,
  ) {
    this.language = language;
    this.scenarioPrompt = scenarioPrompt;
    this.callbacks = callbacks;
  }

  private setState(state: VoiceSessionState) {
    this.sessionState = state;
    this.callbacks.onStateChange(state);
  }

  private async configureAudioMode(): Promise<void> {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    });
  }

  async start(): Promise<void> {
    this.active = true;
    this.setState('connecting');
    logger.info('voice', 'Starting voice session', {
      language: this.language,
      agent: isElevenLabsAgentConfigured,
      tts: isElevenLabsTtsConfigured,
    });

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        logger.warn('voice', 'Microphone denied — continuing in demo mode');
        this.callbacks.onError(
          'Microphone unavailable — demo mode active. Tap to retry with mic.',
        );
        await this.startMockSession();
        return;
      }

      await this.configureAudioMode();

      if (isElevenLabsAgentConfigured) {
        await this.connectWebSocket();
      } else if (isElevenLabsTtsConfigured) {
        await this.startTtsSession();
      } else {
        logger.warn('voice', 'No ElevenLabs credentials — demo mode', {
          hasApiKey: env.elevenLabs.hasApiKey,
          hasAgentId: env.elevenLabs.hasAgentId,
          hint: 'Add keys to mobile/.env.local and restart Metro with --clear',
        });
        await this.startMockSession();
      }
    } catch (err) {
      const msg = humanizeError(err, 'Failed to start voice session');
      logger.error('voice', msg, err);
      this.callbacks.onError(msg);
      this.setState('error');
    }
  }

  async reconnect(): Promise<void> {
    logger.info('voice', 'Reconnecting…');
    await this.stop();
    this.mockTurn = 0;
    this.hasDetectedUserSpeech = false;
    this.mockPending = false;
    await this.start();
  }

  private async resolveVoiceId(): Promise<string> {
    if (this.voiceId) return this.voiceId;
    const voice = await getVoiceForLanguage(this.language);
    this.voiceId = voice.voiceId;
    return this.voiceId;
  }

  private async connectWebSocket(): Promise<void> {
    try {
      const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(env.elevenLabs.agentId)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = async () => {
        logger.info('voice', 'WebSocket connected');
        this.setState('listening');
        await this.startRecording();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      this.ws.onerror = () => {
        const msg = 'Voice connection failed. Falling back to demo mode.';
        logger.error('voice', 'WebSocket error — falling back to mock');
        this.callbacks.onError(msg);
        void this.startMockSession();
      };

      this.ws.onclose = () => {
        logger.warn('voice', 'WebSocket closed');
        if (this.active && this.sessionState !== 'error') {
          this.setState('idle');
        }
      };
    } catch (err) {
      logger.error('voice', 'WebSocket connect failed', err);
      await this.startMockSession();
    }
  }

  private emitUserTranscript(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;

    const now = Date.now();
    if (
      cleaned === this.lastUserTranscript &&
      now - this.lastUserTranscriptAt < 2500
    ) {
      logger.debug('voice', 'Dropped duplicate user transcript', cleaned);
      return;
    }

    this.lastUserTranscript = cleaned;
    this.lastUserTranscriptAt = now;
    this.hasDetectedUserSpeech = true;

    this.callbacks.onTranscript({
      id: `t_${now}`,
      role: 'user',
      text: cleaned,
      timestamp: now,
    });

    const correction = detectCorrection(cleaned, this.language);
    if (correction) this.callbacks.onCorrection(correction);
  }

  private handleWebSocketMessage(data: unknown): void {
    if (typeof data !== 'string') {
      if (data instanceof ArrayBuffer) {
        void this.playAudioChunk(data);
      }
      return;
    }

    try {
      const message = JSON.parse(data) as Record<string, unknown>;
      const type = message.type as string | undefined;

      if (type === 'user_transcript' && message.user_transcription_event) {
        const evt = message.user_transcription_event as { user_transcription?: string; user_transcript?: string };
        const text = (evt.user_transcript ?? evt.user_transcription ?? '').trim();
        if (!this.hasDetectedUserSpeech && text.length < 3) {
          logger.debug('voice', 'Ignored phantom STT (no VAD speech)', text);
          return;
        }
        this.emitUserTranscript(text);
      }

      if (type === 'agent_response' && message.agent_response_event) {
        const evt = message.agent_response_event as { agent_response?: string };
        const text = (evt.agent_response ?? '').trim();
        if (!text) return;
        this.callbacks.onTranscript({
          id: `t_${Date.now()}`,
          role: 'assistant',
          text,
          timestamp: Date.now(),
        });
        this.setState('speaking');
      }

      if (type === 'audio' && message.audio_event) {
        const evt = message.audio_event as { audio_base_64?: string };
        if (evt.audio_base_64) {
          void this.playAudioChunk(decodeBase64ToArrayBuffer(evt.audio_base_64));
        }
      }

      if (type === 'interruption' || type === 'agent_response_correction') {
        this.setState('listening');
      }
    } catch {
      // Binary or non-JSON payloads handled elsewhere
    }
  }

  private async startMockSession(): Promise<void> {
    this.ttsMode = false;
    this.setState('listening');
    await this.startRecording();
    this.scheduleGreeting(false);
  }

  private async startTtsSession(): Promise<void> {
    this.ttsMode = true;
    await this.resolveVoiceId();
    this.setState('listening');
    await this.startRecording();
    this.scheduleGreeting(true);
  }

  private scheduleGreeting(useTts: boolean) {
    setTimeout(() => {
      if (!this.active || this.mockPending) return;
      this.mockPending = true;
      void this.playAssistantGreeting(useTts);
    }, 1200);
  }

  private async playAssistantGreeting(useTts: boolean) {
    const responses = MOCK_RESPONSES[this.language];
    const reply = responses[0]!;

    this.callbacks.onTranscript({
      id: `t_${Date.now()}`,
      role: 'assistant',
      text: reply,
      translation: this.language !== 'english' ? 'Demo translation' : undefined,
      timestamp: Date.now(),
    });
    this.mockTurn = 1;

    if (useTts) {
      await this.speakText(reply);
    } else {
      await this.simulateSpeakingAmplitude(2400);
      if (this.active) this.setState('listening');
    }
    this.mockPending = false;
  }

  private async simulateSpeakingAmplitude(durationMs: number) {
    this.setState('speaking');
    this.startSpeakAmplitudeAnimation();
    await new Promise((r) => setTimeout(r, durationMs));
    this.stopSpeakAmplitudeAnimation();
  }

  private async respondAfterUserSpeech(useTts: boolean) {
    if (!this.active || this.mockPending || this.isPlayingAudio) return;
    this.mockPending = true;
    this.setState('thinking');
    this.callbacks.onAmplitude(0);

    await new Promise((r) => setTimeout(r, 900));
    if (!this.active) {
      this.mockPending = false;
      return;
    }

    const responses = MOCK_RESPONSES[this.language];
    const reply = responses[this.mockTurn % responses.length] ?? responses[0]!;

    this.callbacks.onTranscript({
      id: `t_${Date.now()}`,
      role: 'assistant',
      text: reply,
      translation: this.language !== 'english' ? 'Demo translation' : undefined,
      timestamp: Date.now(),
    });
    this.mockTurn += 1;

    if (useTts && this.ttsMode) {
      await this.speakText(reply);
    } else {
      await this.simulateSpeakingAmplitude(2600);
      if (this.active) this.setState('listening');
    }
    this.mockPending = false;
  }

  private async speakText(text: string): Promise<void> {
    try {
      const voiceId = await this.resolveVoiceId();
      this.setState('speaking');
      logger.info('voice', 'TTS request', { chars: text.length, voiceId });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
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
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`ElevenLabs TTS failed (${response.status}): ${body.slice(0, 120)}`);
      }

      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength) {
        throw new Error('ElevenLabs returned empty audio');
      }

      this.startSpeakAmplitudeAnimation();
      await this.playAudioChunk(buffer);
    } catch (err) {
      const msg = humanizeError(err, 'ElevenLabs API failure');
      logger.error('voice', msg, err);
      this.callbacks.onError(msg);
      this.stopSpeakAmplitudeAnimation();
      this.setState('listening');
    }
  }

  private startSpeakAmplitudeAnimation(): void {
    if (this.speakAmplitudeTimer) clearInterval(this.speakAmplitudeTimer);
    let tick = 0;
    this.speakAmplitudeTimer = setInterval(() => {
      this.callbacks.onAmplitude(0.35 + Math.sin(tick * 0.8) * 0.25);
      tick += 1;
    }, 100);
  }

  private stopSpeakAmplitudeAnimation(): void {
    if (this.speakAmplitudeTimer) {
      clearInterval(this.speakAmplitudeTimer);
      this.speakAmplitudeTimer = null;
    }
    this.callbacks.onAmplitude(0);
  }

  private async pauseMeteringForPlayback() {
    this.isPlayingAudio = true;
    this.playbackGateUntil = Date.now() + VAD_COOLDOWN_AFTER_TTS_MS;
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
      this.meteringInterval = null;
    }
  }

  private async resumeMeteringAfterPlayback() {
    this.isPlayingAudio = false;
    this.playbackGateUntil = Date.now() + VAD_COOLDOWN_AFTER_TTS_MS;
    this.speechStartedAt = null;
    this.lastSpeechAt = Date.now();
    if (this.active && !this.meteringInterval && this.recorder) {
      this.attachMetering();
    }
  }

  private normalizeMetering(metering: number): number {
    // expo-audio returns dB on native (typically -160…0) or 0…1 on web
    if (metering <= 1 && metering >= 0) return metering;
    return Math.max(0, Math.min(1, (metering + 60) / 60));
  }

  private attachMetering() {
    if (this.meteringInterval) clearInterval(this.meteringInterval);

    this.meteringInterval = setInterval(() => {
      if (!this.recorder || !this.active || this.isPlayingAudio) return;
      if (Date.now() < this.playbackGateUntil) {
        this.callbacks.onAmplitude(0);
        return;
      }

      try {
        const status = this.recorder.getStatus();
        if (!status.isRecording) return;

        const normalized =
          status.metering != null
            ? this.normalizeMetering(status.metering)
            : 0;
        this.callbacks.onAmplitude(normalized);

        if (normalized >= VAD_SPEECH_THRESHOLD) {
          if (this.speechStartedAt == null) {
            this.speechStartedAt = Date.now();
          }
          this.lastSpeechAt = Date.now();
          const speechDuration = Date.now() - this.speechStartedAt;
          if (speechDuration >= VAD_MIN_SPEECH_MS) {
            this.hasDetectedUserSpeech = true;
            if (this.active) this.setState('user_speaking');
            this.resetVadTimer();
          }
        } else if (
          this.speechStartedAt != null &&
          Date.now() - this.lastSpeechAt > VAD_SILENCE_MS
        ) {
          void this.flushAudioChunk();
        }
      } catch (err) {
        logger.debug('voice', 'Metering tick failed', err);
      }
    }, 100);
  }

  private async startRecording(): Promise<boolean> {
    try {
      if (this.recorder) {
        try {
          await this.recorder.stop();
        } catch {
          // ignore
        }
        this.recorder = null;
      }

      this.recorder = new AudioModule.AudioRecorder(RECORDING_OPTIONS);
      await this.recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      this.recorder.record();
      this.lastSpeechAt = Date.now();
      this.speechStartedAt = null;
      this.attachMetering();
      return true;
    } catch (err) {
      const msg = humanizeError(err, 'Recording failed');
      logger.warn('voice', msg, err);
      return false;
    }
  }

  private resetVadTimer(): void {
    if (this.vadTimer) clearTimeout(this.vadTimer);
    this.vadTimer = setTimeout(() => {
      void this.flushAudioChunk();
    }, VAD_SILENCE_MS);
  }

  private async flushAudioChunk(): Promise<void> {
    if (!this.recorder || !this.active || this.isPlayingAudio) return;

    const spokeLongEnough =
      this.speechStartedAt != null &&
      Date.now() - this.speechStartedAt >= VAD_MIN_SPEECH_MS;

    if (!spokeLongEnough) {
      this.speechStartedAt = null;
      return;
    }

    try {
      const status = this.recorder.getStatus();
      if (!status.isRecording) return;

      const recordingUri = this.recorder.uri ?? status.url;

      if (this.ws?.readyState === WebSocket.OPEN && recordingUri) {
        const response = await fetch(recordingUri);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 0) {
          this.ws.send(buffer);
          logger.debug('voice', 'Sent audio chunk to STT', { bytes: buffer.byteLength });
        }
        this.setState('thinking');
      } else if (!isElevenLabsAgentConfigured) {
        this.setState('thinking');
        logger.info('voice', 'VAD speech end — requesting demo reply');
        void this.respondAfterUserSpeech(this.ttsMode);
      }

      this.speechStartedAt = null;
      await this.recorder.stop();
      this.recorder = null;
      if (this.active && !this.isPlayingAudio) {
        await this.startRecording();
      }
    } catch (err) {
      logger.warn('voice', 'Flush audio failed', err);
    }
  }

  private async playAudioChunk(buffer: ArrayBuffer): Promise<void> {
    let tempUri: string | null = null;

    try {
      await this.pauseMeteringForPlayback();
      this.setState('speaking');
      logger.info('voice', 'Playback start', { bytes: buffer.byteLength });

      await this.configureAudioMode();

      const base64 = arrayBufferToBase64(buffer);
      tempUri = `${FileSystem.cacheDirectory}nobi-chunk-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (this.player) {
        this.player.remove();
        this.player = null;
      }

      this.player = createAudioPlayer({ uri: tempUri }, { updateInterval: 80 });
      this.player.play();

      await new Promise<void>((resolve, reject) => {
        const subscription = this.player!.addListener(
          'playbackStatusUpdate',
          (status: AudioStatus) => {
            if (!status.isLoaded) {
              if (status.error) {
                subscription.remove();
                reject(new Error(status.error));
              }
              return;
            }

            if (status.playing) {
              const duration = status.duration || 1;
              const progress = Math.min(1, status.currentTime / duration);
              this.callbacks.onPlaybackProgress?.(progress);
              this.callbacks.onAmplitude(
                Math.min(1, 0.35 + (this.player?.volume ?? 0.75) * 0.45),
              );
            }

            if (status.didJustFinish) {
              subscription.remove();
              resolve();
            }
          },
        );
      });

      logger.info('voice', 'Playback complete');
      this.stopSpeakAmplitudeAnimation();
      this.callbacks.onPlaybackProgress?.(1);
      await this.resumeMeteringAfterPlayback();
      if (this.active) this.setState('listening');
    } catch (err) {
      logger.error('voice', 'playAudioChunk failed', err);
      this.stopSpeakAmplitudeAnimation();
      await this.resumeMeteringAfterPlayback();
      if (this.active) this.setState('listening');
    } finally {
      if (tempUri) {
        try {
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  async stop(): Promise<void> {
    this.active = false;
    logger.info('voice', 'Stopping voice session');

    if (this.vadTimer) clearTimeout(this.vadTimer);
    if (this.meteringInterval) clearInterval(this.meteringInterval);
    this.meteringInterval = null;
    this.stopSpeakAmplitudeAnimation();

    if (this.recorder) {
      try {
        await this.recorder.stop();
      } catch {
        // ignore
      }
      this.recorder = null;
    }

    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch {
        // ignore
      }
      this.player = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isPlayingAudio = false;
    this.setState('idle');
  }
}
