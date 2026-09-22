import { LANGUAGE_OPTIONS, type SupportedLanguage } from '../types';

function languageLabel(lang: SupportedLanguage): string {
  return LANGUAGE_OPTIONS.find((l) => l.value === lang)?.label ?? lang;
}

/**
 * Build conversation_initiation_client_data for ElevenLabs ConvAI.
 * Variable names must match agent prompt placeholders exactly (case-sensitive).
 *
 * Agent prompt uses {{ language }} and optionally {{ scenario }}.
 * Do NOT send conversation_config_override unless enabled in agent Security settings.
 */
export function buildAgentInitiationPayload(
  language: SupportedLanguage,
  scenarioPrompt: string,
): {
  type: 'conversation_initiation_client_data';
  dynamic_variables: Record<string, string>;
} {
  const label = languageLabel(language);

  return {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      language: label,
      scenario: scenarioPrompt,
    },
  };
}
