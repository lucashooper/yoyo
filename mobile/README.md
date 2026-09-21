# Nobi

Ultra-minimalist language practice app — drop directly into a live voice conversation with Nobi, your friendly AI language partner.

## Features

- **Onboarding** — pick a language, choose or create a roleplay scenario
- **Zero-friction session** — auto-starts voice practice immediately after onboarding
- **Voice session** — continuous duplex conversation (no hold-to-talk)
- **NobiAvatar** — breathing, blinking, amplitude ripples, thinking shimmer, speaking mouth
- **Transcript drawer** — swipe up for live transcript + translation toggle
- **Grammar corrections** — gentle toast when a mistake is detected
- **Supabase** — auth, session logs, streaks (with local mock fallback)

## Requirements

- Node.js 18+
- Expo Go app (iOS/Android) or simulator/emulator
- Optional: ElevenLabs API key for live TTS voice
- Optional: ElevenLabs agent ID for full conversational AI
- Optional: Supabase project for cloud sync

## Local setup

```bash
cd mobile
npm install
cp .env.example .env.local
```

Edit `.env.local` with your keys (**never commit this file**):

```env
EXPO_PUBLIC_ELEVENLABS_API_KEY=sk_...
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=          # optional — enables convai WebSocket
EXPO_PUBLIC_ELEVENLABS_VOICE_ID=...       # optional — default TTS voice per language
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

When env vars are missing, Nobi runs in **demo mode** with simulated conversations and local AsyncStorage persistence.

## Run

```bash
npm start          # Expo dev server
npm run ios        # iOS simulator (macOS)
npm run android    # Android emulator
npm run web        # Web preview
npm run typecheck  # TypeScript check
npm run export     # Production web export
```

### Why the cloud preview QR won't work

Expo Go on your phone must reach the dev server on your machine over the local network. Cloud agent environments run on remote VMs — their QR codes point to addresses your phone cannot reach. **Clone the repo and run `npm start` locally** to use Expo Go or simulators.

## Project structure

```
mobile/
  app/                  # Expo Router routes
  src/
    screens/            # Onboarding, Home, VoiceSession
    components/         # NobiAvatar, AudioWaveBar, TranscriptDrawer, ...
    services/           # ElevenLabs voice, voiceService, Supabase, corrections
    hooks/              # useVoiceSession, useStreak
    types/              # Shared TypeScript types
    theme/              # Colors, typography
```

## Voice modes

| Configuration | Behavior |
|---|---|
| API key + agent ID | ElevenLabs Conversational AI via WebSocket |
| API key only | TTS playback with language-matched voice |
| No keys | Demo mode with simulated conversation |

## License

Private — Yoyo language app project.
