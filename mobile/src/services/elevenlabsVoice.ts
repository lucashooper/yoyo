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
import {
  arrayBufferToBase64,
  decodeBase64ToArrayBuffer,
  parsePcmSampleRate,
  pcm16ToWav,
} from './audioEncoding';
import { detectCorrection } from './corrections';
import { humanizeError, logger } from './logger';
import { env } from '../config/env';
import { AgentAudioStream } from './agentAudioStream';
import { buildAgentInitiationPayload } from './agentDynamicVariables';
import { getVoiceForLanguage } from './voiceService';

export const isElevenLabsAgentConfigured = env.elevenLabs.isAgentMode;
export const isElevenLabsTtsConfigured = env.elevenLabs.isTtsMode;
export const isElevenLabsConfigured = isElevenLabsAgentConfigured;

/** VAD for UI feedback + gating phantom STT */
const VAD_SPEECH_THRESHOLD = 0.12;
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
  private agentStream: AgentAudioStream | null = null;
  private conversationReady = false;
  private agentStreamPending = false;
  private lastInterruptId = 0;
  private audioQueue: ArrayBuffer[] = [];
  private processingAudioQueue = false;
  private agentMode = false;
  private agentOutputSampleRate = 16000;
  private agentOutputIsPcm = true;

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

  private async resolveConversationUrl(): Promise<string> {
    const agentId = env.elevenLabs.agentId;
    logger.info('voice', 'Requesting signed conversation URL', { agentId: `${agentId.slice(0, 8)}…` });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        headers: { 'xi-api-key': env.elevenLabs.apiKey },
      },
    );

    const body = await response.text().catch(() => '');

    if (!response.ok) {
      logger.warn('voice', 'Signed URL request failed', {
        status: response.status,
        body: body.slice(0, 240),
      });
      throw new Error(`Signed URL failed (${response.status}): ${body.slice(0, 120)}`);
    }

    const data = JSON.parse(body) as { signed_url?: string };
    if (!data.signed_url) {
      throw new Error('ElevenLabs response missing signed_url');
    }

    logger.info('voice', 'Signed conversation URL obtained');
    return data.signed_url;
  }

  private async connectWebSocket(): Promise<void> {
    try {
      let url: string;
      try {
        url = await this.resolveConversationUrl();
      } catch (signedErr) {
        logger.warn('voice', 'Falling back to direct agent_id WebSocket URL', signedErr);
        url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(env.elevenLabs.agentId)}`;
      }

      logger.info('voice', 'Opening WebSocket', { urlPrefix: url.slice(0, 48) });
      this.ws = new WebSocket(url);

      this.agentMode = true;
      this.conversationReady = false;
      let openedAt = 0;

      this.ws.onopen = () => {
        openedAt = Date.now();
        const initiation = buildAgentInitiationPayload(this.language, this.scenarioPrompt);
        logger.info('voice', 'WebSocket connected — sending initiation', {
          dynamicVariables: initiation.dynamic_variables,
        });
        this.ws?.send(JSON.stringify(initiation));
        this.setState('connecting');
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      this.ws.onerror = (event) => {
        const detail =
          typeof event === 'object' && event != null && 'message' in event
            ? String((event as { message?: unknown }).message ?? '')
            : '';
        logger.error('voice', 'WebSocket error', { detail: detail || 'unknown' });
        const msg = detail
          ? `Voice connection error: ${detail}`
          : 'Voice connection failed. Check your agent ID and API key.';
        this.callbacks.onError(msg);
        this.setState('error');
      };

      this.ws.onclose = (event) => {
        const elapsed = openedAt ? Date.now() - openedAt : 0;
        const reason = event.reason?.trim() ?? '';
        const isErrorClose = event.code !== 1000 && event.code !== 1001;

        logger.warn('voice', 'WebSocket closed', {
          code: event.code,
          reason: reason || '(none)',
          wasClean: event.wasClean,
          elapsedMs: elapsed,
          conversationReady: this.conversationReady,
        });

        this.conversationReady = false;
        void this.agentStream?.stop();
        this.agentStream = null;

        if (this.active && this.agentMode && isErrorClose) {
          const hint =
            reason ||
            (event.code === 1006
              ? 'Connection dropped — check agent ID, API key, and dynamic variables.'
              : `Connection closed (code ${event.code}).`);
          logger.error('voice', 'Agent session ended unexpectedly', { hint });
          this.callbacks.onError(hint);
          this.setState('error');
          return;
        }

        if (this.active && this.sessionState !== 'error') {
          this.setState('idle');
        }
      };
    } catch (err) {
      logger.error('voice', 'WebSocket connect failed', err);
      const msg = humanizeError(err, 'Failed to connect to voice agent');
      this.callbacks.onError(msg);
      this.setState('error');
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
        this.enqueueAgentAudio(data);
      }
      return;
    }

    try {
      const message = JSON.parse(data) as Record<string, unknown>;
      const type = message.type as string | undefined;

      if (type === 'conversation_initiation_metadata') {
        this.conversationReady = true;
        const meta = message.conversation_initiation_metadata_event as
          | { agent_output_audio_format?: string }
          | undefined;
        const outputFormat = meta?.agent_output_audio_format ?? 'pcm_16000';
        this.agentOutputIsPcm = outputFormat.toLowerCase().includes('pcm');
        this.agentOutputSampleRate = parsePcmSampleRate(outputFormat);
        logger.info('voice', 'Agent conversation ready', {
          ...meta,
          playback: this.agentOutputIsPcm ? 'wav-wrapped-pcm' : 'native',
        });
        this.setState('listening');
        if (!this.agentStream && !this.agentStreamPending) {
          this.agentStreamPending = true;
          void this.startAgentStream().finally(() => {
            this.agentStreamPending = false;
          });
        }
        return;
      }

      if (type === 'ping') {
        const ping = message.ping_event as { event_id?: number; ping_ms?: number } | undefined;
        if (ping?.event_id != null) {
          const delay = ping.ping_ms ?? 0;
          setTimeout(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'pong', event_id: ping.event_id }));
            }
          }, delay);
        }
        return;
      }

      if (type === 'internal_error' || type === 'error') {
        const errEvt = (message.internal_error_event ?? message.error_event) as
          | { message?: string; code?: number }
          | undefined;
        const errMsg = errEvt?.message ?? 'Unknown agent error';
        logger.error('voice', 'Agent error event', { type, errMsg, code: errEvt?.code });
        this.callbacks.onError(errMsg);
        return;
      }

      if (type === 'user_transcript') {
        const evt = (message.user_transcription_event ??
          message.user_transcript_event) as {
          user_transcription?: string;
          user_transcript?: string;
        } | undefined;
        const text = (evt?.user_transcript ?? evt?.user_transcription ?? '').trim();
        if (!text) return;
        if (!this.hasDetectedUserSpeech && text.length < 2) {
          logger.debug('voice', 'Ignored phantom STT', text);
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
        const evt = message.audio_event as {
          audio_base_64?: string;
          event_id?: number;
        };
        if (evt.event_id != null && evt.event_id <= this.lastInterruptId) return;
        if (evt.audio_base_64) {
          this.enqueueAgentAudio(decodeBase64ToArrayBuffer(evt.audio_base_64));
        }
      }

      if (type === 'interruption') {
        const evt = message.interruption_event as { event_id?: number } | undefined;
        if (evt?.event_id != null) this.lastInterruptId = evt.event_id;
        this.clearAudioQueue();
        this.setState('listening');
      }

      if (type === 'agent_response_correction') {
        this.setState('listening');
      }

      if (
        type &&
        type !== 'agent_response_correction' &&
        ![
          'conversation_initiation_metadata',
          'ping',
          'internal_error',
          'error',
          'user_transcript',
          'agent_response',
          'audio',
          'interruption',
        ].includes(type)
      ) {
        logger.debug('voice', 'Unhandled WebSocket message', { type, keys: Object.keys(message) });
      }
    } catch (err) {
      logger.debug('voice', 'Non-JSON WebSocket payload', err);
    }
  }

  private enqueueAgentAudio(buffer: ArrayBuffer): void {
    if (!buffer.byteLength) return;
    this.audioQueue.push(buffer);
    if (!this.processingAudioQueue) void this.processAgentAudioQueue();
  }

  private clearAudioQueue(): void {
    this.audioQueue = [];
    if (this.player) {
      try {
        this.player.pause();
        this.player.remove();
      } catch {
        // ignore
      }
      this.player = null;
    }
    this.isPlayingAudio = false;
    this.processingAudioQueue = false;
  }

  private async processAgentAudioQueue(): Promise<void> {
    this.processingAudioQueue = true;
    while (this.audioQueue.length > 0 && this.active) {
      const chunk = this.audioQueue.shift();
      if (!chunk) break;
      await this.playAudioChunk(chunk);
    }
    this.processingAudioQueue = false;
  }

  private async startAgentStream(): Promise<void> {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      logger.warn('voice', 'Skipping mic stream — WebSocket not open', {
        readyState: this.ws?.readyState,
      });
      return;
    }

    if (!this.conversationReady) {
      logger.warn('voice', 'Skipping mic stream — conversation not ready');
      return;
    }

    logger.info('voice', 'Starting mic PCM stream');
    this.agentStream = new AgentAudioStream();

    let chunksSent = 0;
    let lastAmplitudeLog = 0;
    let peakAmplitude = 0;

    await this.agentStream.start(({ base64, amplitude }) => {
      if (!this.active || !this.conversationReady) return;

      peakAmplitude = Math.max(peakAmplitude, amplitude);

      if (this.isPlayingAudio) {
        this.callbacks.onAmplitude(Math.max(amplitude, 0.2));
      } else {
        this.callbacks.onAmplitude(amplitude);
      }

      if (this.ws?.readyState !== WebSocket.OPEN) {
        if (chunksSent > 0 && Date.now() - lastAmplitudeLog > 3000) {
          logger.warn('voice', 'Mic active but WebSocket closed — cannot send audio');
          lastAmplitudeLog = Date.now();
        }
        return;
      }

      const now = Date.now();
      if (now - lastAmplitudeLog > 2000) {
        logger.debug('voice', 'Mic level', {
          amplitude: Number(amplitude.toFixed(3)),
          peak: Number(peakAmplitude.toFixed(3)),
          chunksSent,
          state: this.sessionState,
        });
        lastAmplitudeLog = now;
        peakAmplitude = 0;
      }

      if (amplitude >= VAD_SPEECH_THRESHOLD) {
        if (this.speechStartedAt == null) this.speechStartedAt = Date.now();
        this.lastSpeechAt = Date.now();
        this.hasDetectedUserSpeech = true;
        if (this.sessionState !== 'speaking') this.setState('user_speaking');
      } else if (
        this.speechStartedAt != null &&
        Date.now() - this.lastSpeechAt > VAD_SILENCE_MS
      ) {
        this.speechStartedAt = null;
        if (this.sessionState === 'user_speaking') this.setState('listening');
      }

      try {
        this.ws.send(JSON.stringify({ user_audio_chunk: base64 }));
        chunksSent += 1;
        if (chunksSent === 1) {
          logger.info('voice', 'First audio chunk sent to agent');
        }
      } catch (err) {
        logger.warn('voice', 'Failed to send audio chunk', err);
      }
    });
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
    if (this.agentMode) return;
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

      if (this.agentMode) {
        return;
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
      this.startSpeakAmplitudeAnimation();

      const playable =
        this.agentMode && this.agentOutputIsPcm
          ? pcm16ToWav(buffer, this.agentOutputSampleRate, 1)
          : buffer;
      const extension = this.agentMode && this.agentOutputIsPcm ? 'wav' : 'mp3';

      logger.info('voice', 'Playback start', {
        bytes: buffer.byteLength,
        format: extension,
        sampleRate: this.agentOutputSampleRate,
      });

      await this.configureAudioMode();

      const base64 = arrayBufferToBase64(playable);
      tempUri = `${FileSystem.cacheDirectory}nobi-chunk-${Date.now()}.${extension}`;
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (this.player) {
        this.player.remove();
        this.player = null;
      }

      this.player = createAudioPlayer({ uri: tempUri }, { updateInterval: 80 });
      this.player.volume = 1;
      this.player.play();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          subscription.remove();
          reject(new Error('Playback timed out'));
        }, 30000);

        const subscription = this.player!.addListener(
          'playbackStatusUpdate',
          (status: AudioStatus) => {
            if (!status.isLoaded) {
              if (status.error) {
                clearTimeout(timeout);
                subscription.remove();
                reject(new Error(status.error));
              }
              return;
            }

            if (status.playing) {
              const duration = status.duration || 1;
              const progress = Math.min(1, status.currentTime / duration);
              this.callbacks.onPlaybackProgress?.(progress);
            }

            if (status.didJustFinish) {
              clearTimeout(timeout);
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

    await this.agentStream?.stop();
    this.agentStream = null;
    this.agentMode = false;
    this.conversationReady = false;
    this.agentStreamPending = false;
    this.clearAudioQueue();

    this.isPlayingAudio = false;
    this.setState('idle');
  }
}
