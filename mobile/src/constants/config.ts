import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';

const DEFAULT_PORT = 3001;

function getExpoHostIp(): string | null {
  // 1. Modern Expo CLI hostUri (e.g. "10.45.187.59:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri && typeof hostUri === 'string') {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 2. Fallback to NativeModules.SourceCode?.scriptURL (reliable on real devices)
  try {
    const scriptUrl = NativeModules?.SourceCode?.scriptURL;
    if (scriptUrl && typeof scriptUrl === 'string') {
      const match = scriptUrl.match(/https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {}

  // 3. Fallback to linkingUri or experienceUrl if present (e.g. "exp://10.45.187.59:8081/...")
  const linkingUri = (Constants as any).linkingUri || (Constants as any).experienceUrl;
  if (linkingUri && typeof linkingUri === 'string' && linkingUri.includes('://')) {
    try {
      const match = linkingUri.match(/:\/\/(.*?)(:\d+)?(\/|$)/);
      if (match && match[1]) {
        const ip = match[1];
        if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
          return ip;
        }
      }
    } catch {}
  }

  return null;
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const hostIp = getExpoHostIp();

  // 1. If an explicit remote HTTPS endpoint (production, staging, ngrok) is specified, respect it
  if (envUrl && envUrl.startsWith('https://')) {
    return envUrl;
  }

  // 2. If running via Expo Go / Metro dev server, the auto-detected host IP from the bundler connection
  // is the most accurate and resilient address for both Android and iOS devices across changing Wi-Fi networks
  if (hostIp) {
    return `http://${hostIp}:${DEFAULT_PORT}/api`;
  }

  // 3. If an explicit LAN IP was configured in .env (and not localhost/127.0.0.1 on Android)
  if (envUrl) {
    if (Platform.OS === 'android') {
      if (!envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
      }
    } else {
      return envUrl;
    }
  }

  // 4. Android emulator fallback (10.0.2.2 maps to host PC localhost)
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }

  return `http://localhost:${DEFAULT_PORT}/api`;
}

export const config = {
  appName: 'SamadhanSetu',
  appTagline: 'Civic Problem Intelligence & Citizen Redressal',
  stateName: 'Government of Jharkhand',
  get apiBaseUrl(): string {
    return getApiBaseUrl();
  },
  requestTimeoutMs: 15000,
  maxEvidenceUploadSizeBytes: 15 * 1024 * 1024, // 15 MB matching backend
  storageKeys: {
    authToken: 'samadhan_auth_token',
    userProfile: 'samadhan_user_profile',
    activeDraftId: 'samadhan_active_draft_id',
    offlineReports: 'samadhan_offline_reports',
  },
};
