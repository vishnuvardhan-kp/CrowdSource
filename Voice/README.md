# CitizenVoiceModule: Complete Citizen Voice Intelligence

A fully self-contained, production-grade multimodal voice reporting module for civic and enterprise platforms.

Citizens speak naturally in their mother tongue (**Hindi, Tamil, Bengali, Telugu, Kannada, Santhali, English, etc.**). The system transcribes audio via **Sarvam AI (Saarika v2.5)**, translates speech to English, extracts structured civic problem facts using **NVIDIA NIM (meta/llama-3.2-11b-vision-instruct)**, detects missing information, generates conversational follow-up questions in the speaker's language, and registers verified problem statements into your civic registry.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Folder Structure & File Responsibilities](#2-folder-structure--file-responsibilities)
3. [Prerequisites & Dependencies](#3-prerequisites--dependencies)
4. [Backend Integration Guide](#4-backend-integration-guide)
   - [Step 1: Copy Backend Files](#step-1-copy-backend-files)
   - [Step 2: Install Backend Dependencies](#step-2-install-backend-dependencies)
   - [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
   - [Step 4: Register VoiceModule in AppModule](#step-4-register-voicemodule-in-appmodule)
   - [Step 5: Apply Authentication Guards](#step-5-apply-authentication-guards)
   - [Step 6: (Optional) Connect Database Locations](#step-6-optional-connect-database-locations)
5. [Mobile Integration Guide](#5-mobile-integration-guide)
   - [Step 1: Copy Mobile Files](#step-1-copy-mobile-files)
   - [Step 2: Install Mobile Dependencies](#step-2-install-mobile-dependencies)
   - [Step 3: Configure Audio Permissions](#step-3-configure-audio-permissions)
   - [Step 4: Configure API Base URL & Token Provider](#step-4-configure-api-base-url--token-provider)
   - [Step 5: Implement Location Provider](#step-5-implement-location-provider)
   - [Step 6: Implement Challenge Adapter](#step-6-implement-challenge-adapter)
   - [Step 7: Mount VoiceReportScreen in Your Router](#step-7-mount-voicereportscreen-in-your-router)
6. [Multi-Turn Conversational Dialogue Flow](#6-multi-turn-conversational-dialogue-flow)
7. [Audio Specifications & Critical Guardrails](#7-audio-specifications--critical-guardrails)
8. [API Reference & Endpoint Contracts](#8-api-reference--endpoint-contracts)
9. [Troubleshooting & Common Pitfalls](#9-troubleshooting--common-pitfalls)
10. [Verification & Testing Instructions](#10-verification--testing-instructions)

---

## 1. High-Level Architecture

```
                                MOBILE CLIENT (React Native / Expo)
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                        │
│  [ Citizen Speaks in Native Language ]                                                 │
│                    │                                                                   │
│                    ▼                                                                   │
│  [ VoiceRecorder (expo-audio ~57.0.5) ] ────► recording.m4a                            │
│                    │                                                                   │
│                    ▼                                                                   │
│  [ VoiceApi (Dedicated 90s Timeout) ]                                                  │
│         │                                                                              │
│         │ 1. POST /api/voice/transcribe (FormData multipart, audio/mp4)                │
│         │ 2. POST /api/voice/analyze-turn (JSON body with previous turn state)         │
└─────────┼──────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              NESTJS BACKEND API                                        │
│                                                                                        │
│  [ VoiceController & VoiceService ]                                                    │
│         │                                                                              │
│         ├────────► [ Sarvam STT API (Saarika v2.5) ]                                   │
│         │          ├── Detects language code ('ta', 'hi', 'en', etc.)                  │
│         │          ├── Preserves original native transcript                            │
│         │          └── Returns translated English text                                 │
│         │                                                                              │
│         └────────► [ NVIDIA NIM (meta/llama-3.2-11b-vision-instruct) ]                 │
│                    ├── Automatic 3-attempt exponential backoff retry (1s, 2s, 4s)      │
│                    ├── Derives dynamic domain & subDomain without hardcoded if/else    │
│                    ├── Extracts problem facts (issue, affected count, duration, etc.)  │
│                    ├── Validates administrative boundaries (Zero Hallucination)        │
│                    └── If required fields missing: generates follow-up question        │
│                        in citizen's detected language                                  │
└─────────┼──────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          HOST CIVIC PROBLEM REGISTRY                                   │
│                                                                                        │
│  [ VoiceChallengeAdapter ]                                                             │
│         ├── POST /api/challenges/draft   (Creates draft problem statement)             │
│         └── POST /api/challenges/:id/submit (Submits to public administrative queue)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Folder Structure & File Responsibilities

```
CitizenVoiceModule/
│
├── mobile/
│   ├── index.ts                     # Public barrel export for all screens, services, types
│   ├── VoiceReportScreen.tsx        # Self-contained React Native UI screen component
│   ├── voice-api.ts                 # Dedicated HTTP client with 90s timeout & RN multipart
│   ├── voice-recording.ts           # Audio recording and playback manager (expo-audio)
│   ├── voice-state.ts               # Pure state reduction & entity resolution functions
│   ├── voice-types.ts               # Core domain models, provider interfaces & DTOs
│   ├── voice-config.ts              # Configuration, endpoints, MIME mappings, timeouts
│   ├── voice-theme.ts               # Standalone theme tokens (overrideable via props)
│   └── voice-challenge-adapter.ts   # Challenge registry adapter interfaces and factory
│
├── backend/
│   ├── index.ts                     # Public backend barrel export
│   ├── voice.controller.ts          # NestJS controller (POST /transcribe & POST /analyze-turn)
│   ├── voice.service.ts             # Sarvam STT + NVIDIA NIM Llama intelligence service
│   ├── voice.module.ts              # NestJS VoiceModule
│   ├── voice.dto.ts                 # DTOs with class-validator validation
│   └── voice.types.ts               # Domain payloads, STT results, location/fact schemas
│
├── README.md                        # Complete integration guide & documentation (this file)
└── integration-guide.md             # Quick integration checklist and dependency matrix
```

### File Responsibilities

| Subsystem | File | Responsibility |
|---|---|---|
| **Mobile UI** | `VoiceReportScreen.tsx` | Full-featured conversational voice report screen. Handles idle, recording, processing, clarification questions, dual transcripts, fact badges, severity rating, location pickers, and submission. |
| **Mobile Network** | `voice-api.ts` | Communicates with the backend using React Native's native `XMLHttpRequest` multipart upload. Enforces dedicated 90-second voice timeouts. |
| **Mobile Audio** | `voice-recording.ts` | Records real high-quality `.m4a` audio files using `expo-audio` (~57.0.5) with permission management and audio playback. |
| **Mobile State** | `voice-state.ts` | Pure functions for entity resolution (`matchDistrictName`, `matchBlockName`) and multi-turn state reduction (`toConversationState`, `buildVoiceAnalysisResult`). |
| **Mobile Adapters** | `voice-challenge-adapter.ts` | Decouples report registration from any specific backend challenge/ticket entity. |
| **Backend AI** | `voice.service.ts` | Forwards audio to Sarvam AI STT, translates to English, runs Llama 3.2 Vision Instruct with prompt engineering on NVIDIA NIM, and retries on transient errors. |
| **Backend Controller**| `voice.controller.ts` | Exposes `POST /voice/transcribe` and `POST /voice/analyze-turn` endpoints. |

---

## 3. Prerequisites & Dependencies

### Mobile Environment
* React Native 0.76+
* Expo SDK 52+ / 57+
* `expo-audio`: `~57.0.5`
* `react-native-safe-area-context`: `^4.12.0` or `^5.0.0`
* `@expo/vector-icons`: `^14.0.0`

### Backend Environment
* Node.js 18+ or 20+
* NestJS 10+
* `@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `@nestjs/platform-express`
* `class-validator`, `class-transformer`

---

## 4. Backend Integration Guide

Follow these steps to add the backend voice service to your NestJS application.

### Step 1: Copy Backend Files
Copy the `CitizenVoiceModule/backend/` directory into your NestJS project:
```
your-backend/src/modules/voice/
├── index.ts
├── voice.controller.ts
├── voice.service.ts
├── voice.module.ts
├── voice.dto.ts
└── voice.types.ts
```

### Step 2: Install Backend Dependencies
Ensure required packages are installed in your backend:
```bash
npm install @nestjs/config @nestjs/platform-express class-validator class-transformer
npm install -D @types/multer
```

### Step 3: Configure Environment Variables
Add the following keys to your backend `.env` file:
```env
# Sarvam AI STT & Translation
SARVAM_API_KEY=your_sarvam_api_key_here

# NVIDIA NIM Problem Intelligence
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_MODEL=meta/llama-3.2-11b-vision-instruct
```

> **Security Guardrail**: These keys must **never** be included in the mobile client or frontend bundle. All AI requests must route through the NestJS backend.

### Step 4: Register VoiceModule in AppModule
Import `VoiceModule` into your root `AppModule`:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceModule } from './modules/voice/voice.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    VoiceModule,
    // ... your other modules
  ],
})
export class AppModule {}
```

### Step 5: Apply Authentication Guards
By default, `VoiceController` routes are open or guard-ready. To protect the endpoints with your project's JWT authentication:

```typescript
// src/modules/voice/voice.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import your auth guard
import { VoiceService } from './voice.service';
import { AnalyzeVoiceTurnDto } from './voice.dto';

@Controller('voice')
@UseGuards(JwtAuthGuard) // Protect all voice endpoints
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async transcribeAudio(@UploadedFile() file: any) {
    return this.voiceService.transcribeAudio(file);
  }

  @Post('analyze-turn')
  @HttpCode(HttpStatus.OK)
  async analyzeVoiceTurn(@Body() dto: AnalyzeVoiceTurnDto) {
    return this.voiceService.analyzeVoiceTurn(dto);
  }
}
```

### Step 6: (Optional) Connect Database Locations
If your backend has a database service for locations (districts and blocks), inject it into `VoiceService` to enable automatic database ID matching:

```typescript
// In your custom module provider:
import { VoiceService } from './modules/voice';
import { LocationsService } from './modules/locations/locations.service';

export const voiceServiceProvider = {
  provide: VoiceService,
  useFactory: (configService: ConfigService, locationsService: LocationsService) => {
    return new VoiceService(configService, locationsService);
  },
  inject: [ConfigService, LocationsService],
};
```
*If no location service is provided, `VoiceService` gracefully skips database ID matching and returns the extracted location names as plain text without throwing errors.*

---

## 5. Mobile Integration Guide

Follow these steps to embed the voice reporting screen in your React Native / Expo application.

### Step 1: Copy Mobile Files
Copy `CitizenVoiceModule/mobile/` into your mobile codebase:
```
your-mobile-app/src/modules/voice/
├── index.ts
├── VoiceReportScreen.tsx
├── voice-api.ts
├── voice-recording.ts
├── voice-state.ts
├── voice-types.ts
├── voice-config.ts
├── voice-theme.ts
└── voice-challenge-adapter.ts
```

### Step 2: Install Mobile Dependencies
Run the Expo installation command:
```bash
npx expo install expo-audio react-native-safe-area-context @expo/vector-icons
```

### Step 3: Configure Audio Permissions
In `app.json` (or `app.config.js`), ensure microphone permissions are declared:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-audio",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to record audio for citizen voice reports."
        }
      ]
    ]
  }
}
```

### Step 4: Configure API Base URL & Token Provider
Before invoking voice calls, initialize `voiceApi` with your backend URL and auth provider (e.g. in your app entry point `App.tsx` or an initialization hook):

```typescript
import { voiceApi } from './src/modules/voice';
import { getStoredToken } from './src/services/auth';

// Configure the backend API base URL
voiceApi.setBaseUrl('https://api.yourdomain.org/api');

// Configure how voiceApi gets the current user JWT
voiceApi.setAuthTokenProvider(async () => {
  return await getStoredToken();
});
```

### Step 5: Implement Location Provider
`VoiceReportScreen` requires a `VoiceLocationProvider` to populate district and block picker chips:

```typescript
// src/services/location-provider.ts
import { VoiceLocationProvider, DistrictItem, BlockItem } from '../modules/voice';
import { api } from './api';

export const myLocationProvider: VoiceLocationProvider = {
  async getDistricts(): Promise<DistrictItem[]> {
    const res = await api.get('/locations/districts');
    return res.data; // Array of { id, name }
  },

  async getBlocks(districtId: string): Promise<BlockItem[]> {
    const res = await api.get(`/locations/districts/${districtId}/blocks`);
    return res.data; // Array of { id, district_id, name }
  },
};
```

### Step 6: Implement Challenge Adapter
Create an adapter to link the confirmed voice report to your backend ticket or challenge creation endpoint:

```typescript
// src/services/challenge-adapter.ts
import { createVoiceChallengeAdapter } from '../modules/voice';
import { api } from './api';

export const myChallengeAdapter = createVoiceChallengeAdapter({
  async createDraft(params) {
    const res = await api.post('/challenges', {
      title: params.title,
      description: params.description,
      district_id: params.district_id,
      block_id: params.block_id,
      village_locality: params.village_locality,
      citizen_severity: params.citizen_severity,
      category: params.category,
      original_language: params.original_language,
      original_text: params.original_text,
    });
    return { id: res.data.id || res.data.data.id };
  },

  async submitChallenge(challengeId: string) {
    const res = await api.post(`/challenges/${challengeId}/submit`);
    return res.data;
  },
});
```

### Step 7: Mount VoiceReportScreen in Your Router

#### With Expo Router (`app/report/voice.tsx`):
```tsx
import React from 'react';
import { useRouter } from 'expo-router';
import { VoiceReportScreen } from '../../src/modules/voice';
import { myLocationProvider } from '../../src/services/location-provider';
import { myChallengeAdapter } from '../../src/services/challenge-adapter';

export default function VoiceReportRoute() {
  const router = useRouter();

  return (
    <VoiceReportScreen
      adapter={myChallengeAdapter}
      locationProvider={myLocationProvider}
      onConfirmed={(report) => {
        console.log('Voice report submitted successfully:', report.id);
        router.replace('/citizen');
      }}
      onCancel={() => {
        router.back();
      }}
    />
  );
}
```

#### With React Navigation:
```tsx
import React from 'react';
import { VoiceReportScreen } from '../modules/voice';
import { myLocationProvider } from '../services/location-provider';
import { myChallengeAdapter } from '../services/challenge-adapter';

export function VoiceReportScreenWrapper({ navigation }: any) {
  return (
    <VoiceReportScreen
      adapter={myChallengeAdapter}
      locationProvider={myLocationProvider}
      onConfirmed={(report) => {
        navigation.navigate('Home', { newReportId: report.id });
      }}
      onCancel={() => {
        navigation.goBack();
      }}
    />
  );
}
```

---

## 6. Multi-Turn Conversational Dialogue Flow

The module implements a strict multi-turn conversational loop to ensure all required civic parameters are collected without forcing the citizen to fill out lengthy forms:

```
                      TURN 1: Initial Spoken Complaint
Citizen: "எங்கள் கிராமத்தில் பாலம் உடைந்து சாலை முற்றிலும் துண்டிக்கப்பட்டுள்ளது."
STT:      Detected Language: Tamil ('ta')
          Original Transcript preserved
          English Translation: "The bridge in our village is broken, and the road is completely cut off."
Llama:    Domain: "Infrastructure" | SubDomain: "Rural Roads"
          Facts: { what: "Bridge broken, road cut off", population: null }
          Location Check: District = MISSING, Block = MISSING
          Follow-up generated in Tamil: "நமது கிராமத்தின் மாவட்டம் யாது?" (What is our village's district?)
UI:       Transitions to 'asking' state. Displays question in Tamil.

                                   │
                                   ▼
                      TURN 2: Citizen Spoken Answer
Citizen: "திருச்சிராப்பள்ளி மாவட்டம், மணச்சநல்லூர் தொகுதி."
STT:      Tamil -> "Tiruchirappalli district, Manachanallur block."
Llama:    Merges previous facts with new location:
          District: "Tiruchirappalli" (resolved in DB)
          Block: "Manachanallur" (resolved in DB)
          Location Check: District = FOUND, Block = FOUND
          isComplete: true | followUpQuestion: null
UI:       Transitions to 'ready_for_confirmation' state.

                                   │
                                   ▼
                      CONFIRMATION & SUBMISSION
UI:       Displays dual transcripts (Spoken Tamil vs English), verified facts,
          pre-selected location chips, and severity picker.
Citizen:  Reviews / edits and taps "Confirm & Register Report".
Adapter:  Submits draft -> Promotes to registered status in civic DB.
```

---

## 7. Audio Specifications & Critical Guardrails

To prevent production regressions, the following rules are strictly enforced across the module:

### 1. MIME Type for M4A Files: `audio/mp4`
Sarvam AI STT strictly accepts `audio/mp4` and `audio/wav`. It returns **HTTP 400 (Invalid file type)** if sent `audio/m4a`.
- The module automatically maps `.m4a` recordings to `audio/mp4`.
- Never change the upload MIME type back to `audio/m4a`.

### 2. React Native Multipart FormData Handling
In React Native, `FormData` cannot consume web `Blob` or `File` instances directly on Android/iOS.
The module formats the audio part as:
```javascript
formData.append('file', {
  uri: audioUri,
  type: 'audio/mp4',
  name: 'recording.m4a',
});
```
- Never call `JSON.stringify(formData)`.
- Never manually set `Content-Type: multipart/form-data` on the request headers (doing so strips the required boundary parameter).

### 3. Dedicated 90-Second Network Timeout
Voice transcription and Llama NIM multi-turn reasoning require heavy inference time (typically 5–25 seconds depending on audio length).
- `VOICE_API_TIMEOUT_MS` is set to **90,000 ms** (90 seconds).
- This timeout applies exclusively to voice calls; host application timeouts remain untouched.

### 4. Zero Hallucination Safeguards
- **Locations**: If an extracted district or block name does not match a database record, the system strictly returns `null`. It **never** silently falls back to `districts[0]` or `blocks[0]`.
- **Domains & Sub-domains**: Derived dynamically by Llama NIM. If ambiguous, `domain` remains `null` with `requiresReview: true`. Keyword-based fallback mappings (e.g. `if (water) domain = 'Water'`) are strictly prohibited.
- **Affected Population**: If the citizen does not specify a number, `affectedPopulation` remains `null`.

### 5. NVIDIA Transient Failure Resilience
NVIDIA NIM endpoints occasionally return transient HTTP 500, 502, 503, 504, or 429 errors.
- `VoiceService` has a built-in **3-attempt exponential backoff retry mechanism** (1s, 2s, 4s).
- Permanent client errors (e.g. HTTP 400 Bad Request) fail immediately without retrying.

---

## 8. API Reference & Endpoint Contracts

### `POST /api/voice/transcribe`
Uploads raw audio and returns the transcript and English translation.

* **Content-Type**: `multipart/form-data`
* **Headers**: `Authorization: Bearer <JWT>`
* **Form Field**: `file` (binary audio, `.m4a` or `.wav`)

**Response (200 OK):**
```json
{
  "originalTranscript": "हमारे गांव में बिजली का खंभा गिर गया है",
  "detectedLanguage": "hi",
  "languageName": "Hindi (हिन्दी)",
  "languageCode": "hi-IN",
  "englishTranslation": "An electricity pole has fallen down in our village",
  "confidence": 0.998
}
```

---

### `POST /api/voice/analyze-turn`
Performs Llama 3.2 Problem Intelligence, fact extraction, and completeness checks.

* **Content-Type**: `application/json`
* **Headers**: `Authorization: Bearer <JWT>`
* **Request Body:**
```json
{
  "currentTranscript": "An electricity pole has fallen down in our village",
  "detectedLanguage": "hi",
  "englishTranslation": "An electricity pole has fallen down in our village",
  "previousState": {
    "problem_statement": "Previous complaint details if Turn 2...",
    "domain": "Energy & Utilities",
    "facts": { "what_is_happening": "Electricity pole fallen" }
  }
}
```

**Response (200 OK):**
```json
{
  "title": "Fallen Electricity Pole in Village",
  "problem_statement": "An electricity pole has fallen down in our village causing blackout.",
  "problem": "An electricity pole has fallen down in our village causing blackout.",
  "domain": "Energy & Utilities",
  "subDomain": "Power Supply",
  "location": {
    "district": null,
    "block": null,
    "village": null
  },
  "facts": {
    "what_is_happening": "Electricity pole fallen down",
    "where": null,
    "who_is_affected": "Village residents",
    "affected_population": null,
    "duration": null
  },
  "missingRequiredFields": ["district", "block"],
  "requiresReview": false,
  "isDistrictMissing": true,
  "isConstituencyMissing": true,
  "isComplete": false,
  "followUpQuestion": "क्या आपके गांव का नाम है और यह किस जिले में है?",
  "originalTranscript": "हमारे गांव में बिजली का खंभा गिर गया है",
  "englishTranslation": "An electricity pole has fallen down in our village",
  "detectedLanguage": "hi",
  "languageName": "Hindi (हिन्दी)"
}
```

---

## 9. Troubleshooting & Common Pitfalls

| Symptom | Probable Cause | Remedy |
|---|---|---|
| **Sarvam HTTP 400: Invalid file type: audio/m4a** | Audio part MIME type was set to `audio/m4a`. | Ensure MIME type is set to `audio/mp4` in `voice-api.ts` / `voice-config.ts`. |
| **Unsupported FormDataPart error in React Native** | `FormData` was stringified or web `Blob` was passed on mobile. | Use native RN part object `{ uri, type: 'audio/mp4', name: 'recording.m4a' }` with `XMLHttpRequest`. |
| **Network request failed / timeout after 15 seconds** | Global client timeout cancelled the AI call before completion. | Use `VOICE_API_TIMEOUT_MS = 90000` dedicated timeout for voice endpoints. |
| **HTTP 401 Unauthorized on transcribe or analyze-turn** | Missing or expired JWT token. | Provide a valid token via `voiceApi.setAuthTokenProvider(getTokenFn)`. |
| **NVIDIA NIM HTTP 500 error** | Transient server error on NVIDIA inference endpoint. | The built-in retry mechanism automatically retries up to 3 times. Verify `NVIDIA_API_KEY` is valid. |
| **District always defaults to the first item in the list** | A silent fallback `districts[0]` was reintroduced. | Remove any `districts[0]` fallback; unmatched districts must return `null`. |
| **Domain is always 'Infrastructure'** | A hardcoded default `domain \|\| 'Infrastructure'` was used. | Remove hardcoded fallback; unknown domain must remain `null` with `requiresReview: true`. |

---

## 10. Verification & Testing Instructions

To verify the integration in your project:

### 1. Run TypeScript Typecheck
Ensure zero type discrepancies across the codebase:
```bash
# In your mobile project:
npx tsc --noEmit

# In your backend project:
npm run build
```

### 2. Test Audio Upload via cURL
Test your running NestJS backend with a real `.m4a` file:
```bash
curl -X POST http://localhost:3001/api/voice/transcribe \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "file=@recording.m4a;type=audio/mp4"
```

### 3. Test Turn Analysis via cURL
```bash
curl -X POST http://localhost:3001/api/voice/analyze-turn \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentTranscript": "हमारे गांव में पानी की पाइप फूट गई है",
    "detectedLanguage": "hi",
    "englishTranslation": "Water pipe has burst in our village"
  }'
```

### 4. Verify Multi-Turn State
Verify that providing a location in Turn 2 merges with Turn 1:
```bash
curl -X POST http://localhost:3001/api/voice/analyze-turn \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentTranscript": "Ranchi district, Kanke block",
    "detectedLanguage": "hi",
    "englishTranslation": "Ranchi district, Kanke block",
    "previousState": {
      "problem_statement": "Water pipe has burst in our village",
      "domain": "Water & Sanitation"
    }
  }'
```
Expected: `isDistrictMissing: false`, `isConstituencyMissing: false`, `isComplete: true`.
