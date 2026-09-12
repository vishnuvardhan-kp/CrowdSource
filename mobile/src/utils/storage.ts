import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// In-memory fallback for test runners or environments without persistent store
const memoryStore = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch {
      // fallback
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {}
    }

    memoryStore.set(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        return await SecureStore.getItemAsync(key);
      }
    } catch {
      // fallback
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {}
    }

    return memoryStore.get(key) || null;
  },

  async removeItem(key: string): Promise<void> {
    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch {
      // fallback
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {}
    }

    memoryStore.delete(key);
  },
};
