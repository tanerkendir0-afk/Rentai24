# RentAI 24 Mobile App - Setup Guide

## Quick Start

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** app on your phone.

## Development

```bash
# Start development server
npx expo start

# iOS simulator (macOS only)
npx expo start --ios

# Android emulator
npx expo start --android
```

## Environment Configuration

Edit `src/lib/env.ts` to set your API URL:

```typescript
const ENV = {
  API_BASE_URL: "https://your-domain.com",  // Your backend URL
  WS_BASE_URL: "wss://your-domain.com",     // WebSocket URL
};
```

## Building for App Store

### Prerequisites

1. **Apple Developer Account** - https://developer.apple.com ($99/year)
2. **EAS CLI** - `npm install -g eas-cli`
3. **Expo Account** - `npx eas-cli login`

### App Store Assets Required

| Asset | Size | Location |
|-------|------|----------|
| App Icon | 1024x1024 PNG | `assets/icon.png` |
| Splash Screen | 1284x2778 PNG | `assets/splash-icon.png` |
| Adaptive Icon | 1024x1024 PNG | `assets/adaptive-icon.png` |

### Configure eas.json

Fill in your Apple credentials:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

### Build & Submit

```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest

# Or use the helper script
./scripts/submit-to-appstore.sh
```

### Build for Android (Google Play)

```bash
eas build --platform android --profile production
eas submit --platform android --latest
```

## Project Structure

```
mobile/
├── app/                    # Screens (file-based routing)
│   ├── (auth)/            # Login, Register, Onboarding
│   ├── (tabs)/            # Main tab screens
│   ├── agents/            # Agent detail
│   ├── settings/          # Settings sub-screens
│   └── chat/              # Deep link entry
├── src/
│   ├── components/        # UI components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Core utilities
│   ├── services/          # Native services
│   ├── data/              # Static data
│   ├── types/             # TypeScript types
│   └── locales/           # i18n translations
└── assets/                # Images, icons
```

## Features

- **Chat** with 9 AI agents (real-time via WebSocket)
- **Dashboard** with rental stats and usage tracking
- **Agent Catalog** with category filtering
- **Settings** - Profile, Security (Face ID), Language (EN/TR), Notifications
- **Push Notifications** via Expo Push Service
- **Offline Support** with AsyncStorage caching
- **Biometric Auth** (Face ID / Touch ID)
- **Deep Links** - `rentai24://chat/{agentId}`
- **Markdown** rendering in chat messages
- **File Upload** (documents, images)

## Backend Requirements

The mobile app uses the same API as the web app. Additional backend setup:

1. Run migration: `migrations/0006_push_tokens.sql`
2. CORS is configured automatically in `server/index.ts`
3. Session cookies use `sameSite: "none"` in production
