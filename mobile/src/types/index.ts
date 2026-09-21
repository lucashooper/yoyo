export type SupportedLanguage =
  | 'spanish'
  | 'french'
  | 'english'
  | 'japanese'
  | 'german'
  | 'russian';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export type Motivation = 'travel' | 'career' | 'daily';

export type PlanTier = 'monthly' | 'yearly' | 'lifetime' | 'guest';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'speaking'
  | 'error';

export type ScenarioDifficulty = 'easy' | 'medium' | 'hard';

export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  isCustom: boolean;
  icon?: string;
  difficulty?: ScenarioDifficulty;
}

export interface OnboardingData {
  language: SupportedLanguage;
  scenario: Scenario;
  proficiency: ProficiencyLevel;
  motivation: Motivation;
  plan: PlanTier;
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
  xp: number;
  displayName: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  streak: number;
  rank: number;
  isCurrentUser?: boolean;
}

export const LANGUAGE_OPTIONS: {
  value: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
}[] = [
  { value: 'spanish', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { value: 'french', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { value: 'english', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { value: 'japanese', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  { value: 'german', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { value: 'russian', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' },
];

export const PROFICIENCY_OPTIONS: {
  value: ProficiencyLevel;
  label: string;
  description: string;
}[] = [
  { value: 'beginner', label: 'Beginner', description: 'Just starting out' },
  { value: 'intermediate', label: 'Intermediate', description: 'Can hold basic chats' },
  { value: 'advanced', label: 'Advanced', description: 'Want fluency & nuance' },
];

export const MOTIVATION_OPTIONS: {
  value: Motivation;
  label: string;
  description: string;
  icon: string;
}[] = [
  { value: 'travel', label: 'Travel', description: 'Order, ask, explore with ease', icon: '✈️' },
  { value: 'career', label: 'Career', description: 'Meetings, interviews, networking', icon: '💼' },
  { value: 'daily', label: 'Daily practice', description: 'Build a speaking habit', icon: '☀️' },
];

export const PLAN_OPTIONS: {
  value: Exclude<PlanTier, 'guest'>;
  label: string;
  price: string;
  per: string;
  badge?: string;
  highlights: string[];
}[] = [
  {
    value: 'monthly',
    label: 'Monthly',
    price: '$12.99',
    per: '/mo',
    highlights: ['Unlimited voice sessions', 'All languages', 'Grammar tips'],
  },
  {
    value: 'yearly',
    label: 'Yearly',
    price: '$79.99',
    per: '/yr',
    badge: 'Best value',
    highlights: ['Everything in Monthly', '2 months free', 'Priority voices'],
  },
  {
    value: 'lifetime',
    label: 'Lifetime',
    price: '$149',
    per: 'once',
    highlights: ['Pay once, keep forever', 'All future languages', 'Founding badge'],
  },
];

export const DEFAULT_SCENARIOS: Omit<Scenario, 'id'>[] = [
  {
    title: 'Coffee shop order',
    prompt: 'Practice ordering your favorite drink at a cozy café.',
    isCustom: false,
    icon: '☕',
    difficulty: 'easy',
  },
  {
    title: 'Meeting a new friend',
    prompt: 'Introduce yourself and chat about hobbies.',
    isCustom: false,
    icon: '👋',
    difficulty: 'easy',
  },
  {
    title: 'Asking for directions',
    prompt: 'Navigate a new city and ask locals for help.',
    isCustom: false,
    icon: '🗺️',
    difficulty: 'medium',
  },
  {
    title: 'Job interview',
    prompt: 'Answer common interview questions with confidence.',
    isCustom: false,
    icon: '🎯',
    difficulty: 'hard',
  },
  {
    title: 'Restaurant dinner',
    prompt: 'Order food, ask about the menu, and chat with the waiter.',
    isCustom: false,
    icon: '🍽️',
    difficulty: 'medium',
  },
  {
    title: 'Hotel check-in',
    prompt: 'Check into a hotel and request what you need.',
    isCustom: false,
    icon: '🏨',
    difficulty: 'medium',
  },
];
