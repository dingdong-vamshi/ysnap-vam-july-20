import { Platform } from 'react-native';

export const PLAYBACK_SPEED_MIN = 0.5;
export const PLAYBACK_SPEED_MAX = 2.0;
export const PLAYBACK_SPEED_STEP = 0.1;
export const DEFAULT_PLAYBACK_SPEED = 1.0;

const STORAGE_KEY = 'ysnap.playbackSpeed';
const listeners = new Set<(speed: number) => void>();

const canUseLocalStorage = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const normalizePlaybackSpeed = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_PLAYBACK_SPEED;
  const stepped = Math.round(numeric / PLAYBACK_SPEED_STEP) * PLAYBACK_SPEED_STEP;
  const clamped = Math.min(PLAYBACK_SPEED_MAX, Math.max(PLAYBACK_SPEED_MIN, stepped));
  return Number(clamped.toFixed(1));
};

const readStoredPlaybackSpeed = () => {
  if (!canUseLocalStorage()) return DEFAULT_PLAYBACK_SPEED;
  try {
    return normalizePlaybackSpeed(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_PLAYBACK_SPEED;
  }
};

let currentPlaybackSpeed = readStoredPlaybackSpeed();

export const getGlobalPlaybackSpeed = () => currentPlaybackSpeed;

export const setGlobalPlaybackSpeed = (speed: number, options: { persist?: boolean } = {}) => {
  const nextSpeed = normalizePlaybackSpeed(speed);
  currentPlaybackSpeed = nextSpeed;

  if (options.persist !== false && canUseLocalStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextSpeed));
    } catch {
      // Persistence is best-effort; runtime subscribers still receive the update.
    }
  }

  listeners.forEach((listener) => listener(nextSpeed));
  return nextSpeed;
};

export const subscribePlaybackSpeed = (listener: (speed: number) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
