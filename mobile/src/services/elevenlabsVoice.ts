import { Audio } from 'expo-av';
import type { GrammarCorrection, SupportedLanguage, TranscriptEntry, VoiceSessionState } from '../types';
import { detectCorrection } from './corrections';

const API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY ?? '';
const AGENT_ID = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID ?? '';

export const isElevenLabsConfigured =
  API_KEY.length > 0 &&
  !API_KEY.includes('your_') &&
  AGENT_ID.length > 0 &&
  !AGENT_ID.includes('your_');

const VAD_SILENCE_MS = 600;
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
};

export interface VoiceSessionCallbacks {
  onStateChange: (state: VoiceSessionState) => void;
  onAmplitude: (level: number) => void;
  onTranscript: (entry: TranscriptEntry) => void;
  onCorrection: (correction: GrammarCorrection) => void;
  onError: (message: string) => void;
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
  private vadTimer: ReturnType<typeof setTimeout> | null = null;
  private meteringInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    language: SupportedLanguage,
    scenarioPrompt: string,
    callbacks: VoiceSessionCallbacks,
  ) {
    this.language = language;
    this.scenarioPrompt = scenarioPrompt;
    this.callbacks = callbacks;
  }

  async start(): Promise<void> {
    this.active = true;
    this.callbacks.onStateChange('connecting');

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      this.callbacks.onError('Microphone permission is required.');
      this.callbacks.onStateChange('error');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    if (isElevenLabsConfigured) {
      await this.connectWebSocket();
    } else {
      await this.startMockSession();
    }
  }

  private async connectWebSocket(): Promise<void> {
    try {
      // Auth via query param for React Native WebSocket compatibility
      const url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(AGENT_ID)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = async () => {
        this.callbacks.onStateChange('listening');
        await this.startRecording();
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      this.ws.onerror = () => {
        this.callbacks.onError('Voice connection failed. Falling back to demo mode.');
        void this.startMockSession();
      };

      this.ws.onclose = () => {
        if (this.active) {
          this.callbacks.onStateChange('idle');
        }
      };
    } catch {
      await this.startMockSession();
    }
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
        const text = evt.user_transcript ?? '';
        this.callbacks.onTranscript({
          id: `t_${Date.now()}`,
          role: 'user',
          text,
          timestamp: Date.now(),
        });
        const correction = detectCorrection(text, this.language);
        if (correction) this.callbacks.onCorrection(correction);
      }

      if (type === 'agent_response' && message.agent_response_event) {
        const evt = message.agent_response_event as { agent_response?: string };
        const text = evt.agent_response ?? '';
        this.callbacks.onTranscript({
          id: `t_${Date.now()}`,
          role: 'assistant',
          text,
          timestamp: Date.now(),
        });
        this.callbacks.onStateChange('speaking');
      }

      if (type === 'audio' && message.audio_event) {
        const evt = message.audio_event as { audio_base_64?: string };
        if (evt.audio_base_64) {
          const binary = Uint8Array.from(atob(evt.audio_base_64), (c) => c.charCodeAt(0));
          void this.playAudioChunk(binary.buffer);
        }
      }

      if (type === 'interruption' || type === 'agent_response_correction') {
        this.callbacks.onStateChange('listening');
      }
    } catch {
      // Binary or non-JSON payloads handled elsewhere
    }
  }

  private async startMockSession(): Promise<void> {
    this.callbacks.onStateChange('listening');
    await this.startRecording();

    setTimeout(() => {
      if (!this.active) return;
      this.simulateMockExchange();
    }, 2500);
  }

  private simulateMockExchange(): void {
    const userPhrases = ['Hola, me gusta un café', 'Je suis faim', 'I am agree'];
    const userText = userPhrases[this.mockTurn % userPhrases.length] ?? 'Hello!';

    this.callbacks.onStateChange('user_speaking');
    this.callbacks.onAmplitude(0.6);

    setTimeout(() => {
      this.callbacks.onTranscript({
        id: `t_${Date.now()}`,
        role: 'user',
        text: userText,
        timestamp: Date.now(),
      });

      const correction = detectCorrection(userText, this.language);
      if (correction) this.callbacks.onCorrection(correction);

      this.callbacks.onStateChange('thinking');
      this.callbacks.onAmplitude(0);

      setTimeout(() => {
        const responses = MOCK_RESPONSES[this.language];
        const reply = responses[this.mockTurn % responses.length] ?? responses[0]!;

        this.callbacks.onTranscript({
          id: `t_${Date.now() + 1}`,
          role: 'assistant',
          text: reply,
          translation: this.language !== 'english' ? 'Demo translation' : undefined,
          timestamp: Date.now(),
        });

        this.callbacks.onStateChange('speaking');
        this.mockTurn += 1;

        let tick = 0;
        const speakInterval = setInterval(() => {
          this.callbacks.onAmplitude(0.3 + Math.sin(tick) * 0.2);
          tick += 1;
        }, 120);

        setTimeout(() => {
          clearInterval(speakInterval);
          this.callbacks.onAmplitude(0);
          this.callbacks.onStateChange('listening');

          if (this.active && this.mockTurn < 4) {
            setTimeout(() => this.simulateMockExchange(), 4000);
          }
        }, 2800);
      }, 1400);
    }, 1200);
  }

  private async startRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      await recording.startAsync();
      this.recording = recording;
      this.lastSpeechAt = Date.now();

      this.meteringInterval = setInterval(async () => {
        if (!this.recording) return;
        const status = await this.recording.getStatusAsync();
        if (!status.isRecording || status.metering == null) return;

        const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
        this.callbacks.onAmplitude(normalized);

        if (normalized > 0.12) {
          this.lastSpeechAt = Date.now();
          if (this.active) this.callbacks.onStateChange('user_speaking');
          this.resetVadTimer();
        } else if (Date.now() - this.lastSpeechAt > VAD_SILENCE_MS) {
          void this.flushAudioChunk();
        }
      }, 100);
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err.message : 'Recording failed');
    }
  }

  private resetVadTimer(): void {
    if (this.vadTimer) clearTimeout(this.vadTimer);
    this.vadTimer = setTimeout(() => {
      void this.flushAudioChunk();
    }, VAD_SILENCE_MS);
  }

  private async flushAudioChunk(): Promise<void> {
    if (!this.recording || !this.active) return;

    try {
      const status = await this.recording.getStatusAsync();
      if (!status.isRecording) return;

      if (this.ws?.readyState === WebSocket.OPEN) {
        const uri = this.recording.getURI();
        if (uri) {
          const response = await fetch(uri);
          const buffer = await response.arrayBuffer();
          this.ws.send(buffer);
        }
      }

      this.callbacks.onStateChange('thinking');
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
      await this.startRecording();
    } catch {
      // Continue listening on flush errors
    }
  }

  private async playAudioChunk(buffer: ArrayBuffer): Promise<void> {
    try {
      this.callbacks.onStateChange('speaking');
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const uri = `data:audio/mpeg;base64,${base64}`;

      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      this.sound = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.callbacks.onStateChange('listening');
        }
      });
    } catch {
      this.callbacks.onStateChange('listening');
    }
  }

  async stop(): Promise<void> {
    this.active = false;

    if (this.vadTimer) clearTimeout(this.vadTimer);
    if (this.meteringInterval) clearInterval(this.meteringInterval);

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

    this.callbacks.onStateChange('idle');
  }
}
