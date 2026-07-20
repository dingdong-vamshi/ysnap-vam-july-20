import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import {
  getGlobalPlaybackSpeed,
  normalizePlaybackSpeed,
  subscribePlaybackSpeed,
} from '../lib/playbackSpeed';

export type TranslationAudioPlaybackState =
  | 'generating'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'idle';

type AudioSource = string | Blob | ArrayBuffer | ArrayBufferView | Response;

type ActivePlaybackStop = () => Promise<void>;

let activePlaybackId = 0;
let globalPlaybackStop: ActivePlaybackStop | null = null;
let activePlaybackHandleId: number | null = null;

const isLikelyBase64Audio = (value: string) =>
  /^[A-Za-z0-9+/=\s]+$/.test(value) && value.length > 120;

const decodeBase64ToBlob = (value: string, mimeType = 'audio/mpeg') => {
  const normalized = value.includes(',') ? value.split(',').pop() || value : value;
  const compact = normalized.replace(/\s/g, '');
  let binary: string;
  try {
    binary = atob(compact);
  } catch {
    throw new Error('Audio payload is not valid base64');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes as unknown as ArrayBuffer], { type: mimeType });
};

const isAutoplayBlockedError = (err: unknown) => {
  if (!(err instanceof Error)) return false;
  return (
    err.name === 'NotAllowedError' ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('not allowed'))
  );
};

const registerForExclusivePlayback = (stop: ActivePlaybackStop, id: number) => {
  if (activePlaybackHandleId !== id && globalPlaybackStop) {
    void globalPlaybackStop();
  }
  globalPlaybackStop = stop;
  activePlaybackHandleId = id;
};

const buildWebBlobUrl = async (source: AudioSource): Promise<{ url: string; shouldRevoke: boolean }> => {
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) throw new Error('Empty audio source');
    if (trimmed.startsWith('http') || trimmed.startsWith('/') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return { url: trimmed, shouldRevoke: false };
    }
    if (isLikelyBase64Audio(trimmed)) {
      return { url: URL.createObjectURL(decodeBase64ToBlob(trimmed, 'audio/mpeg')), shouldRevoke: true };
    }
    return { url: trimmed, shouldRevoke: false };
  }

  if (source instanceof Blob) {
    return { url: URL.createObjectURL(source), shouldRevoke: true };
  }

  if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
    const bytes =
      source instanceof ArrayBuffer ? new Uint8Array(source) : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    return { url: URL.createObjectURL(new Blob([bytes as unknown as ArrayBuffer], { type: 'audio/mpeg' })), shouldRevoke: true };
  }

  const blob = await source.blob();
  if (!blob || !blob.size) throw new Error('Streaming/response audio is empty');
  return { url: URL.createObjectURL(blob), shouldRevoke: true };
};

export const useTranslationAudioPlayback = () => {
  const instanceId = useMemo(() => {
    activePlaybackId += 1;
    return activePlaybackId;
  }, []);

  const [state, setState] = useState<TranslationAudioPlaybackState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [pendingTapToPlay, setPendingTapToPlay] = useState(false);
  const [sourceReadyFromGesture, setSourceReadyFromGesture] = useState(false);
  const [isCurrentSourceValid, setIsCurrentSourceValid] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(() => getGlobalPlaybackSpeed());

  const player = (Platform.OS === 'web' ? null : useAudioPlayer()) as AudioPlayer | null;
  const status = Platform.OS === 'web' ? null : useAudioPlayerStatus(player as AudioPlayer);

  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const activeSourceRef = useRef<string | null>(null);
  const activeSourceRevocableRef = useRef<boolean>(false);
  const isPlayingRef = useRef(false);

  const clearSource = useCallback(() => {
    const url = activeSourceRef.current;
    if (url && activeSourceRevocableRef.current) {
      URL.revokeObjectURL(url);
      blobUrlsRef.current.delete(url);
    }
    activeSourceRef.current = null;
    activeSourceRevocableRef.current = false;
  }, []);

  const stopCurrent = useCallback(async () => {
    if (Platform.OS === 'web') {
      const audio = webAudioRef.current;
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      isPlayingRef.current = false;
      return;
    }
    if (!player) return;
    player.pause();
    isPlayingRef.current = false;
  }, [player]);

  const registerPlayback = useCallback(async () => {
    const stop = async () => {
      await stopCurrent();
    };
    registerForExclusivePlayback(stop, instanceId);
    await stop();
  }, [instanceId, stopCurrent]);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      const nextRate = normalizePlaybackSpeed(rate);
      setPlaybackRateState(nextRate);
      if (Platform.OS === 'web') {
        const audio = webAudioRef.current;
        if (audio) {
          audio.playbackRate = nextRate;
        }
        return;
      }
      if (player) player.playbackRate = nextRate;
    },
    [player]
  );

  const resolveAndLoad = useCallback(
    async (audio: AudioSource): Promise<string> => {
      clearSource();
      setIsCurrentSourceValid(false);
      setPendingTapToPlay(false);

      if (Platform.OS === 'web') {
        const { url, shouldRevoke } = await buildWebBlobUrl(audio);
        const element = webAudioRef.current || new Audio();
        if (shouldRevoke) {
          blobUrlsRef.current.add(url);
        }
        element.preload = 'auto';
        (element as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        element.crossOrigin = 'anonymous';
        element.playbackRate = playbackRate;
        element.src = url;
        element.load();
        webAudioRef.current = element;
        activeSourceRef.current = url;
        activeSourceRevocableRef.current = shouldRevoke;
        setSourceUrl(url);
        setIsCurrentSourceValid(true);
        return url;
      }

      if (typeof audio !== 'string') {
        throw new Error('Non-string translated audio source is not supported on native playback yet');
      }
      activeSourceRef.current = audio;
      setSourceUrl(audio);
      setIsCurrentSourceValid(true);
      player?.replace({ uri: audio });
      if (player) player.playbackRate = playbackRate;
      return audio;
    },
    [clearSource, playbackRate, player]
  );

  const unlockOnUserGesture = useCallback(async () => {
    setSourceReadyFromGesture(true);
    if (Platform.OS === 'web') {
      const audio = webAudioRef.current || new Audio();
      webAudioRef.current = audio;
      try {
        if (!audio.src) {
          // Keep silent touch intent only; if browser blocks, we still continue and handle later.
          audio.src = '';
        }
        await audio.play();
        audio.pause();
      } catch {
        // Expected when gesture is not currently allowed; state handling will show tap-to-play.
      }
    }
  }, []);

  const load = useCallback(
    async (audio: AudioSource) => {
      setState('generating');
      setErrorMessage(null);
      try {
        const loaded = await resolveAndLoad(audio);
        setState('ready');
        return loaded;
      } catch (err) {
        setState('failed');
        setErrorMessage(err instanceof Error ? err.message : 'Could not prepare translated audio');
        return null;
      }
    },
    [resolveAndLoad]
  );

  const play = useCallback(
    async (audio?: AudioSource): Promise<boolean> => {
      try {
        if (audio) {
          const loaded = await load(audio);
          if (!loaded) return false;
        }

        if (!sourceUrl && !activeSourceRef.current) {
          throw new Error('No translated audio source loaded');
        }

        await registerPlayback();
        await unlockOnUserGesture();
        if (!isCurrentSourceValid || !activeSourceRef.current) {
          throw new Error('No translated audio source loaded');
        }

        setState('ready');
        if (Platform.OS === 'web') {
          const audioEl = webAudioRef.current;
          if (!audioEl) {
            throw new Error('Audio player is not initialized');
          }
          if (!audioEl.src) audioEl.src = activeSourceRef.current;
          audioEl.currentTime = 0;
          audioEl.playbackRate = playbackRate;
          try {
            await audioEl.play();
            setState('playing');
            return true;
          } catch (err) {
            setState('ready');
            if (isAutoplayBlockedError(err)) {
              console.error('Autoplay blocked while starting translation audio:', err);
              setPendingTapToPlay(true);
              return false;
            }
            console.error('Translation audio playback failed:', err);
            setState('failed');
            setErrorMessage(err instanceof Error ? err.message : 'Playback failed');
            return false;
          }
        }

        if (!player) {
          throw new Error('Audio player is not available');
        }
        try {
          player.playbackRate = playbackRate;
          player.play();
          setState('playing');
          return true;
        } catch (err) {
          console.error('Native translation playback failed:', err);
          setState('failed');
          setErrorMessage(err instanceof Error ? err.message : 'Playback failed');
          return false;
        }
      } catch (err) {
        setState('failed');
        setPendingTapToPlay(false);
        console.error('Failed to start translation playback:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Playback failed');
        return false;
      }
    },
    [load, playbackRate, player, registerPlayback, sourceUrl, unlockOnUserGesture, isCurrentSourceValid]
  );

  const pause = useCallback(() => {
    if (Platform.OS === 'web') {
      const audioEl = webAudioRef.current;
      if (!audioEl) return;
      audioEl.pause();
      setState('paused');
      isPlayingRef.current = false;
      return;
    }
    if (!player) return;
    player.pause();
    setState('paused');
    isPlayingRef.current = false;
  }, [player]);

  const replay = useCallback(async (audio?: AudioSource) => {
    if (audio) {
      const loaded = await load(audio);
      if (!loaded) return false;
    }
    if (Platform.OS === 'web') {
      const audioEl = webAudioRef.current;
      if (!audioEl) return false;
      audioEl.currentTime = 0;
      return play();
    }
    if (!player || !isCurrentSourceValid || !sourceUrl) return false;
    player.replace({ uri: sourceUrl });
    return play();
  }, [load, play, isCurrentSourceValid, player, sourceUrl]);

  const toggle = useCallback(async (audio?: AudioSource) => {
    if (state === 'playing') {
      pause();
      return false;
    }

    if (state === 'paused' && !audio) {
      if (Platform.OS === 'web') {
        const audioEl = webAudioRef.current;
        if (!audioEl) return false;
        try {
          audioEl.playbackRate = playbackRate;
          await audioEl.play();
          setState('playing');
          isPlayingRef.current = true;
          return true;
        } catch (err) {
          console.error('Translation playback resume failed:', err);
          if (isAutoplayBlockedError(err)) {
            setPendingTapToPlay(true);
            return false;
          }
          setState('failed');
          setErrorMessage(err instanceof Error ? err.message : 'Playback failed');
          return false;
        }
      }
      if (player) {
        player.playbackRate = playbackRate;
        player.play();
        setState('playing');
        return true;
      }
    }
    return play(audio);
  }, [pause, play, playbackRate, player, state]);

  const stop = useCallback(async () => {
    await stopCurrent();
    setState('ready');
    setCurrentTime(0);
    setPendingTapToPlay(false);
  }, [stopCurrent]);

  const reset = useCallback(async () => {
    await stop();
    clearSource();
    setSourceUrl(null);
    setState('idle');
    setDuration(0);
    setCurrentTime(0);
    setPendingTapToPlay(false);
    setIsCurrentSourceValid(false);
  }, [clearSource, stop]);

  useEffect(() => {
    const applyRate = (speed: number) => {
      const nextRate = normalizePlaybackSpeed(speed);
      setPlaybackRateState(nextRate);

      if (Platform.OS === 'web') {
        const audio = webAudioRef.current;
        if (audio) audio.playbackRate = nextRate;
        return;
      }

      if (player) player.playbackRate = nextRate;
    };

    applyRate(getGlobalPlaybackSpeed());
    return subscribePlaybackSpeed(applyRate);
  }, [player]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const audio = webAudioRef.current || new Audio();
      webAudioRef.current = audio;
      const onEnded = () => {
        setState('completed');
        setCurrentTime(audio.currentTime || 0);
        setDuration(audio.duration || 0);
        isPlayingRef.current = false;
        setPendingTapToPlay(false);
      };
      const onTime = () => {
        setCurrentTime(audio.currentTime || 0);
      };
      const onLoaded = () => {
        setDuration(audio.duration || 0);
      };
      const onPlay = () => {
        setState('playing');
        isPlayingRef.current = true;
        setPendingTapToPlay(false);
      };
      const onPause = () => {
        if (
          isPlayingRef.current &&
          !audio.ended &&
          audio.currentTime > 0 &&
          audio.currentTime < (audio.duration || 0)
        ) {
          setState('paused');
        }
        isPlayingRef.current = false;
      };
      const onError = () => {
        setState('failed');
        setErrorMessage('Audio playback error');
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('error', onError);

      return () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('timeupdate', onTime);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('error', onError);
      };
    }

    if (!status) return;
    if (status.duration > 0) {
      setDuration(status.duration);
      if (status.currentTime >= status.duration - 0.2) {
        setState((prev) => (prev === 'playing' ? 'completed' : prev));
      }
    }
    if (!Number.isNaN(status.currentTime)) {
      setCurrentTime(status.currentTime);
    }
    if (status.playing) {
      setState('playing');
      isPlayingRef.current = true;
    } else if (status.duration > 0 && status.currentTime > 0) {
      setState((prev) => (prev === 'playing' ? 'paused' : prev));
      isPlayingRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    return () => {
      clearSource();
      if (webAudioRef.current) {
        webAudioRef.current.pause();
      }
      if (activePlaybackHandleId === instanceId && globalPlaybackStop) {
        void globalPlaybackStop();
      }
      if (activePlaybackHandleId === instanceId) {
        activePlaybackHandleId = null;
        globalPlaybackStop = null;
      }
    };
  }, [clearSource, instanceId]);

  return useMemo(
    () => ({
      state,
      errorMessage,
      duration,
      currentTime,
      progress: duration ? currentTime / duration : 0,
      sourceUrl,
      pendingTapToPlay,
      sourceReadyFromGesture,
      playbackRate,
      isPlaying: state === 'playing',
      isReady: state === 'ready',
      setPlaybackRate,
      load,
      play,
      pause,
      replay,
      stop,
      reset,
      toggle,
      unlockOnUserGesture,
    }),
    [
      state,
      errorMessage,
      duration,
      currentTime,
      sourceUrl,
      pendingTapToPlay,
      sourceReadyFromGesture,
      playbackRate,
      setPlaybackRate,
      load,
      play,
      pause,
      replay,
      stop,
      reset,
      toggle,
      unlockOnUserGesture,
    ]
  );
};
