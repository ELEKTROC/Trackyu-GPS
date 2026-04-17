/**
 * TrackYu Mobile - Storage utility using AsyncStorage
 * More stable and well-supported for React Native
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Export storage wrapper with async API
export const storage = {
  getString: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },

  set: async (key: string, value: string | number | boolean): Promise<void> => {
    await AsyncStorage.setItem(key, String(value));
  },

  delete: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },

  contains: async (key: string): Promise<boolean> => {
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  },

  clearAll: async (): Promise<void> => {
    await AsyncStorage.clear();
  },
};

// Helper functions for typed access
export const storageHelpers = {
  getObject: async <T>(key: string): Promise<T | null> => {
    const value = await storage.getString(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  },

  setObject: async <T>(key: string, value: T): Promise<void> => {
    await storage.set(key, JSON.stringify(value));
  },
};

export default storage;
