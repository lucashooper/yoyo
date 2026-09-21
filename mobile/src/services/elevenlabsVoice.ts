import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { GrammarCorrection, SupportedLanguage, TranscriptEntry, VoiceSessionState } from '../types';
import { arrayBufferToBase64, decodeBase64ToArrayBuffer } from './audioEncoding';
import { detectCorrection } from './corrections';
import { humanizeError, logger } from './logger';
import { getVoiceForLanguage } from './voiceService';

const API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';
const AGENT_ID = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID ?? '';

const hasValidKey = API_KEY.length > 0 && !API_KEY.includes('your_');
const hasValidAgent = AGENT_ID.length > 0 && !AGENT_ID.includes('your_');

export const isElevenLabsAgentConfigured = hasValidKey && hasValidAgent;
export const isElevenLabsTtsConfigured = hasValidKey && !hasValidAgent;
export const isElevenLabsConfigured = isElevenLabsAgentConfigured;

/** Strict VAD — ignore ambient noise / phantom spikes */
const VAD_SPEECH_THRESHOLD = 0.22;
const VAD_MIN_SPEECH_MS = 280;
const VAD_SILENCE_MS = 750;
const VAD_COOLDOWN_AFTER_TTS_MS = 900;

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
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
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

  async start(): Promise<void> {
    this.active = true;
    this.setState('connecting');
    logger.info('voice', 'Starting voice session', {
      language: this.language,
      agent: isElevenLabsAgentConfigured,
      tts: isElevenLabsTtsConfigured,
    });

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        const msg = 'Microphone permission is required.';
        logger.error('voice', msg);
        this.callbacks.onError(msg);
        this.setState('error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (isElevenLabsAgentConfigured) {
        await this.connectWebSocket();
      } else if (isElevenLabsTtsConfigured) {
        await this.startTtsSession();
      } else {
        logger.warn('voice', 'No ElevenLabs credentials — demo mode');
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
      const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(AGENT_ID)}`;
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

    // Deduplicate phantom / repeated STT inserts
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
        const evt = message.user_transcription_event as { user_transcript?: string };
        const text = (evt.user_transcript ?? '').trim();
        // Only accept STT when we recently detected real speech via VAD
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

  private async startTtsSession(): Promise<void> {
    this.ttsMode = true;
    await this.resolveVoiceId();
    this.setState('listening');
    await this.startRecording();
    this.scheduleGreeting(true);
  }

  private async startMockSession(): Promise<void> {
    this.ttsMode = false;
    this.setState('listening');
    await this.startRecording();
    this.scheduleGreeting(false);
  }

  /** Greeting only — no phantom user transcripts until VAD fires */
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

  /** After real user speech (VAD), generate a mock / TTS reply — never invent user text */
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
            'xi-api-key': API_KEY,
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
    if (this.active && !this.meteringInterval && this.recording) {
      this.attachMetering();
    }
  }

  private attachMetering() {
    if (this.meteringInterval) clearInterval(this.meteringInterval);

    this.meteringInterval = setInterval(async () => {
      if (!this.recording || !this.active || this.isPlayingAudio) return;
      if (Date.now() < this.playbackGateUntil) {
        this.callbacks.onAmplitude(0);
        return;
      }

      try {
        const status = await this.recording.getStatusAsync();
        if (!status.isRecording || status.metering == null) return;

        const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
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

  private async startRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      this.recording = recording;
      this.lastSpeechAt = Date.now();
      this.speechStartedAt = null;
      this.attachMetering();
    } catch (err) {
      const msg = humanizeError(err, 'Recording failed');
      logger.error('voice', msg, err);
      this.callbacks.onError(msg);
    }
  }

  private resetVadTimer(): void {
    if (this.vadTimer) clearTimeout(this.vadTimer);
    this.vadTimer = setTimeout(() => {
      void this.flushAudioChunk();
    }, VAD_SILENCE_MS);
  }

  private async flushAudioChunk(): Promise<void> {
    if (!this.recording || !this.active || this.isPlayingAudio) return;

    const spokeLongEnough =
      this.speechStartedAt != null &&
      Date.now() - this.speechStartedAt >= VAD_MIN_SPEECH_MS;

    if (!spokeLongEnough) {
      this.speechStartedAt = null;
      return;
    }

    try {
      const status = await this.recording.getStatusAsync();
      if (!status.isRecording) return;

      if (this.ws?.readyState === WebSocket.OPEN) {
        const uri = this.recording.getURI();
        if (uri) {
          const response = await fetch(uri);
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength > 0) {
            this.ws.send(buffer);
            logger.debug('voice', 'Sent audio chunk to STT', { bytes: buffer.byteLength });
          }
        }
        this.setState('thinking');
      } else if (!isElevenLabsAgentConfigured) {
        // Demo / TTS path: acknowledge real speech without inventing transcript text
        this.setState('thinking');
        logger.info('voice', 'VAD speech end — requesting demo reply');
        void this.respondAfterUserSpeech(this.ttsMode);
      }

      this.speechStartedAt = null;
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      if (this.active && !this.isPlayingAudio) {
        await this.startRecording();
      }
    } catch (err) {
      logger.warn('voice', 'Flush audio failed', err);
    }
  }

  private async playAudioChunk(buffer: ArrayBuffer): Promise<void> {
    try {
      await this.pauseMeteringForPlayback();
      this.setState('speaking');
      logger.info('voice', 'Playback start', { bytes: buffer.byteLength });

      // Re-assert silent-switch override before each play (iOS)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const base64 = arrayBufferToBase64(buffer);
      const uri = `data:audio/mpeg;base64,${base64}`;

      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 80 },
      );
      this.sound = sound;

      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            if (status.error) {
              logger.error('voice', 'Playback load error', status.error);
              this.callbacks.onError('Audio playback failed');
              resolve();
            }
            return;
          }

          if (status.isPlaying) {
            const duration = status.durationMillis ?? 1;
            const position = status.positionMillis ?? 0;
            const progress = Math.min(1, position / duration);
            this.callbacks.onPlaybackProgress?.(progress);
            const metering = status.volume ?? 0.75;
            this.callbacks.onAmplitude(Math.min(1, 0.35 + metering * 0.45));
          }

          if (status.didJustFinish) {
            logger.info('voice', 'Playback complete');
            this.stopSpeakAmplitudeAnimation();
            this.callbacks.onPlaybackProgress?.(1);
            resolve();
          }
        });
      });

      await this.resumeMeteringAfterPlayback();
      if (this.active) this.setState('listening');
    } catch (err) {
      logger.error('voice', 'playAudioChunk failed', err);
      this.stopSpeakAmplitudeAnimation();
      await this.resumeMeteringAfterPlayback();
      if (this.active) this.setState('listening');
    }
  }

  async stop(): Promise<void> {
    this.active = false;
    logger.info('voice', 'Stopping voice session');

    if (this.vadTimer) clearTimeout(this.vadTimer);
    if (this.meteringInterval) clearInterval(this.meteringInterval);
    this.meteringInterval = null;
    this.stopSpeakAmplitudeAnimation();

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // ignore
      }
      this.recording = null;
    }

    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {
        // ignore
      }
      this.sound = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isPlayingAudio = false;
    this.setState('idle');
  }
}
