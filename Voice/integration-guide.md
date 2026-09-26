# CitizenVoiceModule Integration Guide

This guide details how to integrate `CitizenVoiceModule/` into any external React Native / Expo mobile application and NestJS backend.

---

## 1. System Responsibilities Matrix

### A. MUST PROVIDE (By Host Application)

| Requirement | Description | Integration Point |
|---|---|---|
| **API Base URL** | Host backend URL (e.g. `https://api.mycivicapp.org/api`) | `voiceApi.setBaseUrl(url)` |
| **Authentication Token** | Method providing the current user's JWT token | `voiceApi.setAuthTokenProvider(fn)` or `authProvider` prop |
| **Location Provider** | Service fetching administrative boundaries (districts, blocks) | Passed via `<VoiceReportScreen locationProvider={...} />` |
| **Challenge Submitter** | Callback or adapter creating and submitting records in your DB | Passed via `<VoiceReportScreen adapter={...} />` |
| **Navigation Callback** | Handlers for navigation upon report registration or cancellation | Passed via `onConfirmed` and `onCancel` props |

### B. ALREADY PROVIDED (By This Module)

* Real microphone recording and playback via `expo-audio (~57.0.5)`.
* React Native multipart form data handling (M4A mapped to `audio/mp4`).
* Dedicated 90-second timeout configuration (`VOICE_API_TIMEOUT_MS`).
* Sarvam AI STT & translation integration with auto language detection.
* Original language preservation and English normalization.
* NVIDIA NIM Llama 3.2 11B Vision Instruct multi-turn prompt engineering.
* Dynamic domain and sub-domain categorization without hardcoded if-else logic.
* Fact extraction (issue, location, affected count, duration, frequency, impact).
* Intelligent missing-field detection and natural follow-up question generation.
* Interactive multi-turn state reduction (`toConversationState`, `buildVoiceAnalysisResult`).
* Dual-transcript and fact-validation UI screen (`VoiceReportScreen`).

### C. EXTERNAL BACKEND REQUIREMENTS

* **Sarvam AI API Key** with access to `speech-to-text` (Saarika v2.5).
* **NVIDIA NIM API Key** with access to `meta/llama-3.2-11b-vision-instruct`.
* Environment variables in backend `.env`:
  - `SARVAM_API_KEY`
  - `NVIDIA_API_KEY`
  - `NVIDIA_BASE_URL` (defaults to `https://integrate.api.nvidia.com/v1`)
  - `LLM_MODEL` (defaults to `meta/llama-3.2-11b-vision-instruct`)
* NestJS app configuration loading `@nestjs/config`.

### D. SHARED PROJECT DEPENDENCIES

* **Authentication Guard**: Apply your project's guard (`JwtAuthGuard`) to the controller endpoints.
* **Administrative Registry**: Your project's location lookup tables.
* **Issue/Challenge Registry**: Your project's ticketing or challenge database.
* **UI Theme & Localization**: Optional `theme` override and `t` translation function.

---

## 2. Integrating into a React Native / Expo Project

### Step 1: Install Peer Dependencies
Ensure your project contains:
```bash
npx expo install expo-audio react-native-safe-area-context @expo/vector-icons
```

### Step 2: Copy the Mobile Folder
Copy `CitizenVoiceModule/mobile/` into your app:
```
my-app/src/modules/voice/
```

### Step 3: Initialize API Transport
In your app's initialization (e.g. `App.tsx` or an API bootstrap file):
```typescript
import { voiceApi } from './modules/voice';
import { getAuthToken } from './services/auth';

voiceApi.setBaseUrl('https://api.myproject.org/api');
voiceApi.setAuthTokenProvider(async () => {
  return await getAuthToken();
});
```

### Step 4: Implement Location & Challenge Adapters
```typescript
import {
  VoiceLocationProvider,
  createVoiceChallengeAdapter,
  DistrictItem,
  BlockItem,
} from './modules/voice';
import { api } from './services/api';

// 1. Location Provider
export const myLocationProvider: VoiceLocationProvider = {
  async getDistricts(): Promise<DistrictItem[]> {
    const res = await api.get('/locations/districts');
    return res.data;
  },
  async getBlocks(districtId: string): Promise<BlockItem[]> {
    const res = await api.get(`/locations/districts/${districtId}/blocks`);
    return res.data;
  },
};

// 2. Challenge Adapter
export const myChallengeAdapter = createVoiceChallengeAdapter({
  async createDraft(params) {
    const res = await api.post('/issues/draft', params);
    return { id: res.data.id };
  },
  async submitChallenge(id) {
    const res = await api.post(`/issues/${id}/submit`);
    return res.data;
  },
});
```

### Step 5: Mount `VoiceReportScreen` in a Route
```tsx
import React from 'react';
import { useRouter } from 'expo-router'; // or react-navigation
import { VoiceReportScreen } from './modules/voice';
import { myLocationProvider, myChallengeAdapter } from './adapters';

export default function VoiceReportRoute() {
  const router = useRouter();

  return (
    <VoiceReportScreen
      adapter={myChallengeAdapter}
      locationProvider={myLocationProvider}
      onConfirmed={(report) => {
        console.log('Voice report confirmed and submitted:', report.id);
        router.replace('/home');
      }}
      onCancel={() => {
        router.back();
      }}
    />
  );
}
```

---

## 3. Integrating into a NestJS Backend

### Step 1: Install Peer Dependencies
```bash
npm install @nestjs/config @nestjs/platform-express class-validator class-transformer
```

### Step 2: Copy the Backend Folder
Copy `CitizenVoiceModule/backend/` into your NestJS project:
```
my-backend/src/modules/voice/
```

### Step 3: Register `VoiceModule` in `AppModule`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceModule } from './modules/voice';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    VoiceModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### Step 4: Configure Environment Variables
Add to your `.env` file:
```env
SARVAM_API_KEY=your_sarvam_api_key_here
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_MODEL=meta/llama-3.2-11b-vision-instruct
```

---

## 4. Multi-Turn Dialogue Verification

When a citizen reports a problem without specifying their district or block:
1. Turn 1: Llama notes missing administrative fields and generates a follow-up question in the citizen's detected language (e.g. *"क्या आपके गांव का नाम है और जिला क्या है?"*).
2. Citizen speaks the follow-up answer.
3. Turn 2: Sarvam transcribes the answer, and Llama merges the previous facts with the newly provided location details.
4. Once required fields are satisfied, the UI shifts automatically to the confirmation screen.
