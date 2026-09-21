import { useCallback, useEffect, useRef, useState } from 'react';
import { ElevenLabsVoiceService } from '../services/elevenlabsVoice';
import type {
  GrammarCorrection,
  SupportedLanguage,
  TranscriptEntry,
  VoiceSessionState,
} from '../types';

interface UseVoiceSessionOptions {
  language: SupportedLanguage;
  scenarioPrompt: string;
  autoStart?: boolean;
}

export function useVoiceSession({
  language,
  scenarioPrompt,
  autoStart = true,
}: UseVoiceSessionOptions) {
  const serviceRef = useRef<ElevenLabsVoiceService | null>(null);
  const [state, setState] = useState<VoiceSessionState>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [correction, setCorrection] = useState<GrammarCorrection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (serviceRef.current) return;

    const service = new ElevenLabsVoiceService(language, scenarioPrompt, {
      onStateChange: setState,
      onAmplitude: setAmplitude,
      onTranscript: (entry) => setTranscript((prev) => [...prev, entry]),
      onCorrection: setCorrection,
      onError: setError,
    });

    serviceRef.current = service;
    await service.start();
  }, [language, scenarioPrompt]);

  const stop = useCallback(async () => {
    await serviceRef.current?.stop();
    serviceRef.current = null;
    setState('idle');
  }, []);

  const dismissCorrection = useCallback(() => setCorrection(null), []);

  useEffect(() => {
    if (autoStart) {
      void start();
    }
    return () => {
      void serviceRef.current?.stop();
      serviceRef.current = null;
    };
  }, [autoStart, start]);

  const statusText: Record<VoiceSessionState, string> = {
    idle: '',
    connecting: 'Connecting...',
    listening: "I'm listening...",
    user_speaking: "I'm listening...",
    thinking: 'Thinking...',
    speaking: 'Nobi is speaking...',
    error: error ?? 'Something went wrong',
  };

  return {
    state,
    amplitude,
    transcript,
    correction,
    error,
    statusText: statusText[state],
    start,
    stop,
    dismissCorrection,
  };
}
