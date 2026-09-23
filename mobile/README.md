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

Edit **`mobile/.env.local`** with your keys (**never commit this file**).

**Important:** the file must sit next to `mobile/package.json` — **not** inside `mobile/app/`, and not at the repo root:

```
mobile/
  package.json
  .env.local   ← here
  app/         ← NOT here
```

```bash
# from repo root
cp mobile/.env.example mobile/.env.local
```

After adding or changing keys, restart Metro with a clean cache:

```bash
npm run start:tunnel -- --clear
```

On launch, check the Metro log for `[Nobi:env] Credential diagnostics` — it shows whether keys were loaded (masked).

Example `.env.local`:

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
npm run start:tunnel  # Dev server with tunnel (recommended over --tunnel alone)
npm run ios        # iOS simulator (macOS)
npm run android    # Android emulator
npm run web        # Web preview
npm run typecheck  # TypeScript check
npm run export     # Production web export
```

### Tunnel mode (Expo Go on a different network)

`expo start --tunnel` uses legacy **ngrok v2**, which ngrok's API no longer supports reliably. You may see:

```text
CommandError: TypeError: Cannot read properties of undefined (reading 'body')
```

Reinstalling `@expo/ngrok` will not fix this — the bundled ngrok agent is too old.

**Use Expo's v2 WebSocket tunnel instead** (SDK 57+):

```bash
npm run start:tunnel
# or manually:
EXPO_UNSTABLE_TUNNEL_V2=1 npx expo start --tunnel
```

On first use, log in to Expo so the CLI can mint a signed tunnel URL:

```bash
npx expo login
```

The QR code will point at an `*.on.expo.app` URL instead of ngrok.

**Same Wi‑Fi?** Skip tunnel entirely — `npm start` and scan the LAN QR code (press `s` to switch connection type if needed).

**Windows (cmd):** `set EXPO_UNSTABLE_TUNNEL_V2=1 && npx expo start --tunnel`

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
