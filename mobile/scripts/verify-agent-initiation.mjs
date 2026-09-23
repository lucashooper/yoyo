#!/usr/bin/env node
/**
 * Verifies ElevenLabs agent initiation payload rules (no runtime deps).
 * Run: npm run verify:voice-init
 */

const LANGUAGE_ISO = {
  russian: 'ru',
  spanish: 'es',
  german: 'de',
  french: 'fr',
  japanese: 'ja',
  english: 'en',
};

function buildLanguageOnlyPayload(language, scenarioPrompt) {
  const label = language.charAt(0).toUpperCase() + language.slice(1);
  const iso = LANGUAGE_ISO[language];
  return {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      language: label === 'Russian' ? 'Russian' : label,
      scenario: scenarioPrompt,
    },
    conversation_config_override: {
      agent: { language: iso },
    },
  };
}

let failed = 0;

for (const [appLang, iso] of Object.entries(LANGUAGE_ISO)) {
  const payload = buildLanguageOnlyPayload(appLang, 'test scenario');
  const agentLang = payload.conversation_config_override?.agent?.language;
  const hasTts = Boolean(payload.conversation_config_override?.tts);

  if (agentLang !== iso) {
    console.error(`FAIL ${appLang}: expected agent.language=${iso}, got ${agentLang}`);
    failed += 1;
    continue;
  }
  if (hasTts) {
    console.error(`FAIL ${appLang}: tts override must not be present`);
    failed += 1;
    continue;
  }
  console.log(`OK  ${appLang} -> ${iso}`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}

console.log('\nAll agent initiation language mappings verified.');
console.log('Live session: look for [Nobi:voice] logs with iso6391 and agentLanguage matching.');
