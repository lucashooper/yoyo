# Nobi

Ultra-minimalist language practice app — drop directly into a live voice conversation with Nobi, your friendly AI language partner.

## Features

- **Onboarding** — pick a language, choose or create a roleplay scenario
- **Home lesson card** — streak pill, mascot, and one-tap Start
- **Voice session** — continuous duplex conversation (no hold-to-talk)
- **NobiAvatar** — breathing, blinking, amplitude ripples, thinking shimmer, speaking mouth
- **Transcript drawer** — drag up for live transcript + translation toggle
- **Grammar corrections** — gentle toast when a mistake is detected
- **Supabase** — auth, session logs, streaks (with local mock fallback)

## Requirements

- Node.js 18+
- Expo Go app (iOS/Android) or simulator/emulator
- Optional: ElevenLabs API key + agent ID for live voice
- Optional: Supabase project for cloud sync

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local
```

Edit `.env.local` with your keys (never commit this file):

```env
EXPO_PUBLIC_ELEVENLABS_API_KEY=sk_...
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=agent_...
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

Scan the QR code with Expo Go, or press `i` / `a` for simulators.

## Project structure

```
mobile/
  app/                  # Expo Router routes
  src/
    screens/            # Onboarding, Home, VoiceSession
    components/         # NobiAvatar, AudioWaveBar, TranscriptDrawer, ...
    services/           # ElevenLabs voice, Supabase, corrections
    hooks/              # useVoiceSession, useStreak
    types/              # Shared TypeScript types
    theme/              # Colors, typography
```

## ElevenLabs notes

The voice service connects to ElevenLabs Conversational AI via WebSocket when configured. React Native WebSocket does not support custom headers on all platforms — if connection fails, the app automatically falls back to demo mode. For production native builds, consider a thin backend proxy for auth.

## Supabase schema (optional)

```sql
create table profiles (
  id uuid primary key,
  streak int default 0,
  last_session_date date,
  total_sessions int default 0
);

create table session_logs (
  id text primary key,
  user_id uuid references profiles(id),
  started_at timestamptz,
  ended_at timestamptz,
  language text,
  scenario_title text,
  transcript_length int
);
```

Enable anonymous auth or magic link in Supabase Auth settings.

## License

Private — Yoyo language app project.
