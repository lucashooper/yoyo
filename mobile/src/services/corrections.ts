import type { GrammarCorrection, SupportedLanguage } from '../types';

/** Extension point: swap this for LLM metadata parsing in production. */
const HEURISTIC_PATTERNS: Record<
  SupportedLanguage,
  { pattern: RegExp; suggestion: string; explanation?: string }[]
> = {
  spanish: [
    {
      pattern: /\bme gusta\b/i,
      suggestion: 'Me gustaría',
      explanation: 'Use conditional for polite requests.',
    },
    {
      pattern: /\bestoy\b.*\bagua\b/i,
      suggestion: 'Quiero agua',
      explanation: '"Estoy agua" is incorrect — use "quiero" for wanting something.',
    },
  ],
  french: [
    {
      pattern: /\bje suis\b.*\bfaim\b/i,
      suggestion: "J'ai faim",
      explanation: 'French uses "avoir faim", not "être faim".',
    },
  ],
  english: [
    {
      pattern: /\bi am agree\b/i,
      suggestion: 'I agree',
      explanation: '"Agree" is a verb — no "am" needed.',
    },
  ],
  japanese: [],
  russian: [
    {
      pattern: /\bя есть\b/i,
      suggestion: 'У меня есть',
      explanation: 'Use "у меня есть" to express possession.',
    },
  ],
  german: [
    {
      pattern: /\bich bin\b.*\bhungrig\b/i,
      suggestion: 'Ich habe Hunger',
      explanation: 'German uses "Hunger haben" for being hungry.',
    },
  ],
};

export function detectCorrection(
  text: string,
  language: SupportedLanguage,
): GrammarCorrection | null {
  const patterns = HEURISTIC_PATTERNS[language] ?? [];
  for (const { pattern, suggestion, explanation } of patterns) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      return {
        id: `corr_${Date.now()}`,
        original: match?.[0] ?? text,
        suggestion,
        explanation,
      };
    }
  }
  return null;
}

/** Parse LLM response metadata when available. */
export function parseCorrectionFromMetadata(
  metadata: Record<string, unknown> | undefined,
): GrammarCorrection | null {
  if (!metadata?.correction) return null;
  const c = metadata.correction as Partial<GrammarCorrection>;
  if (!c.suggestion) return null;
  return {
    id: c.id ?? `corr_${Date.now()}`,
    original: c.original ?? '',
    suggestion: c.suggestion,
    explanation: c.explanation,
  };
}
