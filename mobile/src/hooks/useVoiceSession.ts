import { useCallback, useEffect, useRef, useState } from 'react';
import { ElevenLabsVoiceService } from '../services/elevenlabsVoice';
import { humanizeError, logger } from '../services/logger';
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
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const sessionKeyRef = useRef(0);

  const start = useCallback(async () => {
    if (serviceRef.current) return;

    const key = ++sessionKeyRef.current;
    setError(null);
    setTranscript([]);
    setCorrection(null);
    setPlaybackProgress(0);

    logger.info('useVoiceSession', 'Creating voice service', { language });

    const service = new ElevenLabsVoiceService(language, scenarioPrompt, {
      onStateChange: (next) => {
        if (sessionKeyRef.current !== key) return;
        setState(next);
      },
      onAmplitude: (level) => {
        if (sessionKeyRef.current !== key) return;
        setAmplitude(level);
      },
      onTranscript: (entry) => {
        if (sessionKeyRef.current !== key) return;
        setTranscript((prev) => {
          // Guard against ghost/duplicate inserts from STT
          const last = prev[prev.length - 1];
          if (
            last &&
            last.role === entry.role &&
            last.text === entry.text &&
            entry.timestamp - last.timestamp < 2000
          ) {
            return prev;
          }
          return [...prev, entry];
        });
      },
      onCorrection: (c) => {
        if (sessionKeyRef.current !== key) return;
        setCorrection(c);
      },
      onError: (message) => {
        if (sessionKeyRef.current !== key) return;
        const friendly = humanizeError(message);
        logger.error('useVoiceSession', friendly);
        setError(friendly);
      },
      onPlaybackProgress: (progress) => {
        if (sessionKeyRef.current !== key) return;
        setPlaybackProgress(progress);
      },
    });

    serviceRef.current = service;
    try {
      await service.start();
    } catch (err) {
      const msg = humanizeError(err, 'Failed to start session');
      logger.error('useVoiceSession', msg, err);
      setError(msg);
      setState('error');
    }
  }, [language, scenarioPrompt]);

  const stop = useCallback(async () => {
    sessionKeyRef.current += 1;
    await serviceRef.current?.stop();
    serviceRef.current = null;
    setState('idle');
    setAmplitude(0);
  }, []);

  const reconnect = useCallback(async () => {
    logger.info('useVoiceSession', 'Reconnect requested');
    setError(null);
    await serviceRef.current?.stop();
    serviceRef.current = null;
    setState('idle');
    await start();
  }, [start]);

  const dismissCorrection = useCallback(() => setCorrection(null), []);
  const dismissError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (autoStart) {
      void start();
    }
    return () => {
      sessionKeyRef.current += 1;
      void serviceRef.current?.stop();
      serviceRef.current = null;
    };
  }, [autoStart, start]);

  const statusText: Record<VoiceSessionState, string> = {
    idle: '',
    connecting: 'Connecting…',
    listening: "I'm listening…",
    user_speaking: 'Hearing you…',
    thinking: 'Thinking…',
    speaking: 'Nobi is speaking…',
    error: error ?? 'Connection lost — Tap to reconnect',
  };

  return {
    state,
    amplitude,
    transcript,
    correction,
    error,
    playbackProgress,
    statusText: statusText[state],
    start,
    stop,
    reconnect,
    dismissCorrection,
    dismissError,
  };
}
