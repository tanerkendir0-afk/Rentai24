import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";

const CACHE_KEY = "rentai24_query_cache";

/**
 * Persist query cache to AsyncStorage for offline support.
 * Caches: conversations, rentals, agents, user profile.
 */
export async function persistCache(queryClient: QueryClient): Promise<void> {
  const cachableKeys = [
    "/api/rentals",
    "/api/auth/me",
    "/api/boost/status",
  ];

  const cache: Record<string, unknown> = {};

  for (const key of cachableKeys) {
    const data = queryClient.getQueryData([key]);
    if (data) {
      cache[key] = data;
    }
  }

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Silently fail - caching is best-effort
  }
}

/**
 * Restore query cache from AsyncStorage on app startup.
 */
export async function restoreCache(queryClient: QueryClient): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const cache = JSON.parse(raw) as Record<string, unknown>;

    for (const [key, data] of Object.entries(cache)) {
      queryClient.setQueryData([key], data);
    }
  } catch {
    // Silently fail - restore is best-effort
  }
}

/**
 * Clear the persisted cache (e.g., on logout).
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
