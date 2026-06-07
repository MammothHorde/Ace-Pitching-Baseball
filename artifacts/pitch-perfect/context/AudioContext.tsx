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
  throw:        require('@/assets/audio/throw.mp3'),
  mitt:         require('@/assets/audio/mitt.mp3'),
  hit:          require('@/assets/audio/hit.mp3'),
  cheer:        require('@/assets/audio/cheer.mp3'),
  tap:          require('@/assets/audio/tap.mp3'),
  umpBall:      require('@/assets/audio/ump_ball.mp3'),
  umpStrike1:   require('@/assets/audio/ump_strike1.mp3'),
  umpStrike2:   require('@/assets/audio/ump_strike2.mp3'),
  umpStrikeout: require('@/assets/audio/ump_strikeout.mp3'),
  boo:          require('@/assets/audio/boo.mp3'),
};

interface AudioContextType {
  playSfx: (name: SfxName) => void;
  /** Play a sound effect after `ms` milliseconds (for layered reactions). */
  playSfxIn: (name: SfxName, ms: number) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { settings } = usePitcher();
  const bgmRef    = useRef<AudioPlayer | null>(null);
  const sfxRef    = useRef<Partial<Record<SfxName, AudioPlayer>>>({});
  const bgmVolRef = useRef(settings.bgmVolume);
  const sfxVolRef = useRef(settings.sfxVolume);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── One-time setup ─────────────────────────────────────────────────────────
  // We AWAIT setAudioModeAsync before creating any players.  On iOS the audio
  // session must be configured first — skipping the await means createAudioPlayer
  // starts loading while the session is still in its default state, causing
  // play() to silently fail in the simulator.
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,    // honour the ringer switch on iOS
          interruptionMode:  'duckOthers',
          allowsRecording:   false,
          shouldPlayInBackground: false,
        });
      } catch { /* simulators may not support every mode option */ }

      if (!mounted) return;

      // BGM
      const bgm  = createAudioPlayer(require('@/assets/audio/bgm.mp3'));
      bgm.loop   = true;
      bgm.volume = bgmVolRef.current;
      bgmRef.current = bgm;

      // Start BGM right away on native; web will block until first gesture.
      if (bgmVolRef.current > 0) {
        try { bgm.play(); } catch { /* web autoplay policy — first tap unblocks */ }
      }

      // SFX players
      (Object.keys(SFX_SOURCES) as SfxName[]).forEach(name => {
        if (!mounted) return;
        const p  = createAudioPlayer(SFX_SOURCES[name]!);
        p.volume = sfxVolRef.current;
        sfxRef.current[name] = p;
      });
    }

    init();

    return () => {
      mounted = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      bgmRef.current?.remove();
      bgmRef.current = null;
      Object.values(sfxRef.current).forEach(p => p?.remove());
      sfxRef.current = {};
    };
  }, []);

  // ── BGM volume / play state ─────────────────────────────────────────────────
  useEffect(() => {
    bgmVolRef.current = settings.bgmVolume;
    const bgm = bgmRef.current;
    if (!bgm) return;
    bgm.volume = settings.bgmVolume;
    if (settings.bgmVolume > 0) {
      if (!bgm.playing) {
        try { bgm.play(); } catch { /* web: need gesture first */ }
      }
    } else {
      bgm.pause();
    }
  }, [settings.bgmVolume]);

  // ── SFX volume ──────────────────────────────────────────────────────────────
  useEffect(() => {
    sfxVolRef.current = settings.sfxVolume;
  }, [settings.sfxVolume]);

  // ── Play helpers ────────────────────────────────────────────────────────────
  const playSfx = (name: SfxName) => {
    // First tap also unblocks BGM autoplay on web.
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
