export type SupportedLanguage = 'spanish' | 'french' | 'english' | 'japanese' | 'german';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  isCustom: boolean;
}

export interface OnboardingData {
  language: SupportedLanguage;
  scenario: Scenario;
  completedAt: string;
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  translation?: string;
  timestamp: number;
}

export interface GrammarCorrection {
  id: string;
  original: string;
  suggestion: string;
  explanation?: string;
}

export interface SessionLog {
  id: string;
  startedAt: string;
  endedAt?: string;
  language: SupportedLanguage;
  scenarioTitle: string;
  transcriptLength: number;
}

export interface UserProfile {
  id: string;
  streak: number;
  lastSessionDate: string | null;
  totalSessions: number;
}

export const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'spanish', label: 'Spanish', flag: '🇪🇸' },
  { value: 'french', label: 'French', flag: '🇫🇷' },
  { value: 'english', label: 'English', flag: '🇬🇧' },
  { value: 'japanese', label: 'Japanese', flag: '🇯🇵' },
  { value: 'german', label: 'German', flag: '🇩🇪' },
];

export const DEFAULT_SCENARIOS: Omit<Scenario, 'id'>[] = [
  {
    title: 'Coffee shop order',
    prompt: 'Practice ordering your favorite drink at a cozy café.',
    isCustom: false,
  },
  {
    title: 'Meeting a new friend',
    prompt: 'Introduce yourself and chat about hobbies.',
    isCustom: false,
  },
  {
    title: 'Asking for directions',
    prompt: 'Navigate a new city and ask locals for help.',
    isCustom: false,
  },
];
