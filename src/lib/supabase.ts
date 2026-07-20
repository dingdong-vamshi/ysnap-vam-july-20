import { createClient, processLock, type Session } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import type { Database } from '../types/database';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

let parsedSupabaseUrl: URL;

try {
  parsedSupabaseUrl = new URL(supabaseUrl ?? '');
} catch {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL was not loaded as a valid URL'
  );
}

if (
  parsedSupabaseUrl.protocol !== 'https:' ||
  !parsedSupabaseUrl.hostname
) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL must be a valid HTTPS project URL'
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the root .env.local file'
  );
}

// Secure storage adapter for auth tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Native apps do not have browser visibility events, so refresh tokens only
// while the application is active. Register this once with the shared client.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

let anonymousSessionPromise: Promise<Session> | null = null;

export class AuthenticationRequiredError extends Error {
  readonly code = 'AUTHENTICATION_REQUIRED';

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

async function readFunctionError(error: unknown, functionName = 'edge-function'): Promise<Error> {
  const fallbackMessage = error instanceof Error ? error.message : 'Edge function request failed';
  const status = (error as { status?: number } | null)?.status;
  const context = (error as { context?: Response } | null)?.context;

  if (status === 401) {
    return new Error('Your session is not authenticated for this function. Sign in and try again.');
  }
  if (status === 403) {
    return new Error('You do not have permission to access this translation feature.');
  }
  if (status === 404) {
    return new Error(`The ${functionName} Edge Function is not deployed or not reachable.`);
  }
  if (status === 429) {
    return new Error('Too many translation requests. Please wait a moment and try again.');
  }

  if (!context || typeof context.clone !== 'function') {
    if (fallbackMessage.includes('Failed to send a request to the Edge Function')) {
      return new Error(`Failed to send a request to the ${functionName} Edge Function. Check your network and function deployment.`);
    }
    return new Error(fallbackMessage);
  }

  try {
    const response = context.clone();
    const payload = await response.json() as { error?: string; message?: string };
    const providerMessage = payload.error || payload.message;
    if (providerMessage) {
      if (providerMessage.includes('ELEVENLABS_API_KEY is not configured')) {
        return new Error('Voice services are not configured in Supabase yet. Add the voice service secret key and try again.');
      }
      if (providerMessage.includes('GEMINI_API_KEY is not configured')) {
        return new Error('Translation services are not configured in Supabase yet. Add the Gemini secret and try again.');
      }
      if (providerMessage.includes('high demand') || providerMessage.includes('status 503')) {
        return new Error('Gemini is temporarily busy. Please try the translation again.');
      }
      return new Error(providerMessage);
    }
  } catch {
    // Keep the SDK fallback when the function did not return JSON.
  }

    return new Error(fallbackMessage);
}

async function getOrCreateFunctionSession(): Promise<Session> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;

  // Demo users still need a real Supabase identity so Edge Functions and RLS
  // can securely persist their translations. Reuse one in-flight request to
  // avoid creating multiple anonymous identities when screens load together.
  if (!anonymousSessionPromise) {
    anonymousSessionPromise = supabase.auth
      .signInAnonymously({
        options: {
          data: { display_name: 'YSnap Guest' },
        },
      })
      .then(({ data, error }) => {
        if (error || !data.session) {
          throw new AuthenticationRequiredError(
            error?.message === 'Anonymous sign-ins are disabled'
              ? 'Guest access is not enabled yet. Please sign in to translate.'
              : error?.message || 'Please sign in to translate.',
          );
        }
        return data.session;
      })
      .finally(() => {
        anonymousSessionPromise = null;
      });
  }

  return anonymousSessionPromise;
}

/**
 * Call an authenticated Supabase Edge Function
 */
export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown> | FormData,
  options?: { headers?: Record<string, string> }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const session = await getOrCreateFunctionSession();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds safety timeout

    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...options?.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (error) {
      return { data: null, error: await readFunctionError(error, functionName) };
    }

    return { data: data as T, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.name === 'AbortError' 
        ? new Error('Request timed out after 20 seconds. Please check your network connection.') 
        : (err instanceof Error ? err : new Error('Edge function call failed')),
    };
  }
}

/**
 * Upload a file to private storage
 */
export async function uploadPrivateFile(
  bucket: string,
  filePath: string,
  file: Blob | ArrayBuffer,
  contentType: string
): Promise<{ path: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    return { path: null, error };
  }

  return { path: data.path, error: null };
}

/**
 * Get a signed URL for a private file
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data.signedUrl;
}
