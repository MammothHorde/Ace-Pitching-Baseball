import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { PitcherProfile, PitcherStats, PitchingStyle, PitchType } from '@/constants/GameTypes';
import { UPGRADE_COSTS, PITCH_UNLOCK_COSTS, getAvailablePoints } from '@/utils/gameLogic';

const STORAGE_KEY = '@pitcher_profile_v1';

const DEFAULT_PROFILE: PitcherProfile = {
  name: 'Rookie',
  level: 1,
  gamesPlayed: 0,
  highScore: 0,
  lifetimePoints: 0,
  spentPoints: 0,
  stats: { speed: 1, accuracy: 1, stamina: 1, spin: 1 },
  unlockedPitches: ['fastball', 'curveball'],
  statUpgradeCounts: { speed: 0, accuracy: 0, stamina: 0, spin: 0 },
  pitchingStyle: 'classic',
};

interface PitcherContextType {
  profile: PitcherProfile;
  isLoading: boolean;
  pitchingStyle: PitchingStyle;
  setPitchingStyle: (style: PitchingStyle) => Promise<void>;
  recordGameResult: (score: number) => Promise<void>;
  upgradeStat: (stat: keyof PitcherStats) => boolean;
  unlockPitch: (pitch: PitchType) => boolean;
  availablePoints: number;
  getStatUpgradeCost: (stat: keyof PitcherStats) => number;
  canUpgradeStat: (stat: keyof PitcherStats) => boolean;
  canUnlockPitch: (pitch: PitchType) => boolean;
}

const PitcherContext = createContext<PitcherContextType | null>(null);

export function PitcherProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PitcherProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) {
        try {
          const saved = JSON.parse(data) as PitcherProfile;
          setProfile({
            ...DEFAULT_PROFILE,
            ...saved,
            pitchingStyle: saved.pitchingStyle ?? 'classic',
          });
        } catch {
          setProfile(DEFAULT_PROFILE);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback(async (updated: PitcherProfile) => {
    setProfile(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const setPitchingStyle = useCallback(async (style: PitchingStyle) => {
    setProfile(prev => {
      const updated: PitcherProfile = { ...prev, pitchingStyle: style };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const recordGameResult = useCallback(async (score: number) => {
    setProfile(prev => {
      const updated: PitcherProfile = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        highScore: Math.max(prev.highScore, score),
        lifetimePoints: prev.lifetimePoints + score,
        level: Math.floor((prev.gamesPlayed + 1) / 3) + 1,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const upgradeStat = useCallback((stat: keyof PitcherStats): boolean => {
    let success = false;
    setProfile(prev => {
      const count = prev.statUpgradeCounts[stat];
      if (count >= 10) return prev;
      const cost = UPGRADE_COSTS[count] ?? 9999;
      const available = prev.lifetimePoints - prev.spentPoints;
      if (available < cost) return prev;
      success = true;
      const updated: PitcherProfile = {
        ...prev,
        spentPoints: prev.spentPoints + cost,
        stats: { ...prev.stats, [stat]: Math.min(10, prev.stats[stat] + 1) },
        statUpgradeCounts: { ...prev.statUpgradeCounts, [stat]: count + 1 },
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    return success;
  }, []);

  const unlockPitch = useCallback((pitch: PitchType): boolean => {
    let success = false;
    setProfile(prev => {
      if (prev.unlockedPitches.includes(pitch)) return prev;
      const cost = PITCH_UNLOCK_COSTS[pitch];
      const available = prev.lifetimePoints - prev.spentPoints;
      if (available < cost) return prev;
      success = true;
      const updated: PitcherProfile = {
        ...prev,
        spentPoints: prev.spentPoints + cost,
        unlockedPitches: [...prev.unlockedPitches, pitch],
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    return success;
  }, []);

  const available = getAvailablePoints(profile);

  const getStatUpgradeCost = useCallback((stat: keyof PitcherStats): number => {
    return UPGRADE_COSTS[profile.statUpgradeCounts[stat]] ?? 9999;
  }, [profile.statUpgradeCounts]);

  const canUpgradeStat = useCallback((stat: keyof PitcherStats): boolean => {
    if (profile.statUpgradeCounts[stat] >= 10) return false;
    return available >= (UPGRADE_COSTS[profile.statUpgradeCounts[stat]] ?? 9999);
  }, [profile.statUpgradeCounts, available]);

  const canUnlockPitch = useCallback((pitch: PitchType): boolean => {
    if (profile.unlockedPitches.includes(pitch)) return false;
    return available >= PITCH_UNLOCK_COSTS[pitch];
  }, [profile.unlockedPitches, available]);

  return (
    <PitcherContext.Provider value={{
      profile,
      isLoading,
      pitchingStyle: profile.pitchingStyle ?? 'classic',
      setPitchingStyle,
      recordGameResult,
      upgradeStat,
      unlockPitch,
      availablePoints: available,
      getStatUpgradeCost,
      canUpgradeStat,
      canUnlockPitch,
    }}>
      {children}
    </PitcherContext.Provider>
  );
}

export function usePitcher() {
  const ctx = useContext(PitcherContext);
  if (!ctx) throw new Error('usePitcher must be used within PitcherProvider');
  return ctx;
}
