import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { usePitcher } from '@/context/PitcherContext';

export type SfxName =
  | 'throw'
  | 'mitt'
  | 'hit'
  | 'cheer'
  | 'tap'
  | 'umpBall'
  | 'umpStrike1'
  | 'umpStrike2'
  | 'umpStrikeout'
  | 'boo';

const SFX_SOURCES: Record<SfxName, number> = {
  throw: require('@/assets/audio/throw.mp3'),
  mitt: require('@/assets/audio/mitt.mp3'),
  hit: require('@/assets/audio/hit.mp3'),
  cheer: require('@/assets/audio/cheer.mp3'),
  tap: require('@/assets/audio/tap.mp3'),
  umpBall: require('@/assets/audio/ump_ball.mp3'),
  umpStrike1: require('@/assets/audio/ump_strike1.mp3'),
  umpStrike2: require('@/assets/audio/ump_strike2.mp3'),
  umpStrikeout: require('@/assets/audio/ump_strikeout.mp3'),
  boo: require('@/assets/audio/boo.mp3'),
};

interface AudioContextType {
  playSfx: (name: SfxName) => void;
  /** Play a sound effect after `ms` milliseconds (for layered reactions). */
  playSfxIn: (name: SfxName, ms: number) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { settings } = usePitcher();
  const bgmRef = useRef<AudioPlayer | null>(null);
  const sfxRef = useRef<Partial<Record<SfxName, AudioPlayer>>>({});
  const bgmVolRef = useRef(settings.bgmVolume);
  const sfxVolRef = useRef(settings.sfxVolume);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Create players once.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

    const bgm = createAudioPlayer(require('@/assets/audio/bgm.mp3'));
    bgm.loop = true;
    bgm.volume = bgmVolRef.current;
    bgmRef.current = bgm;

    (Object.keys(SFX_SOURCES) as SfxName[]).forEach(name => {
      const p = createAudioPlayer(SFX_SOURCES[name]);
      p.volume = sfxVolRef.current;
      sfxRef.current[name] = p;
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      bgmRef.current?.remove();
      bgmRef.current = null;
      Object.values(sfxRef.current).forEach(p => p?.remove());
      sfxRef.current = {};
    };
  }, []);

  // React to volume changes. Browsers block autoplay until a user gesture, so
  // bgm reliably starts on the first tap (see playSfx) or when the music slider
  // is moved — both are user gestures.
  useEffect(() => {
    bgmVolRef.current = settings.bgmVolume;
    const bgm = bgmRef.current;
    if (!bgm) return;
    bgm.volume = settings.bgmVolume;
    if (settings.bgmVolume > 0) {
      try { bgm.play(); } catch { /* autoplay blocked until gesture */ }
    } else {
      bgm.pause();
    }
  }, [settings.bgmVolume]);

  useEffect(() => {
    sfxVolRef.current = settings.sfxVolume;
  }, [settings.sfxVolume]);

  const playSfx = (name: SfxName) => {
    // First tap doubles as the gesture that unblocks background music on web.
    const bgm = bgmRef.current;
    if (bgm && bgmVolRef.current > 0 && !bgm.playing) {
      try { bgm.play(); } catch { /* ignore */ }
    }

    if (sfxVolRef.current <= 0) return;
    const p = sfxRef.current[name];
    if (!p) return;
    try {
      p.volume = sfxVolRef.current;
      p.seekTo(0);
      p.play();
    } catch { /* ignore */ }
  };

  const playSfxIn = (name: SfxName, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== id);
      playSfx(name);
    }, ms);
    timersRef.current.push(id);
  };

  return (
    <AudioCtx.Provider value={{ playSfx, playSfxIn }}>{children}</AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
