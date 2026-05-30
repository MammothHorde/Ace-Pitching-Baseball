import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PitcherStats, PitchingStyle, PitchType } from '@/constants/GameTypes';
import { PITCH_INFO, PITCH_UNLOCK_COSTS, UPGRADE_COSTS } from '@/utils/gameLogic';
import { usePitcher } from '@/context/PitcherContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STAT_INFO: Record<keyof PitcherStats, { label: string; icon: IconName; description: string }> = {
  speed:    { label: 'Speed',    icon: 'speedometer',      description: 'Fastballs harder to hit' },
  accuracy: { label: 'Accuracy', icon: 'target',           description: 'Accuracy needle slows down' },
  stamina:  { label: 'Stamina',  icon: 'battery-charging', description: 'More time to charge power' },
  spin:     { label: 'Spin',     icon: 'rotate-3d-variant', description: 'Breaking balls drop harder' },
};

const ALL_UNLOCKABLE: PitchType[] = ['slider', 'changeup', 'splitter', 'cutter'];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const {
    profile, availablePoints,
    pitchingStyle, setPitchingStyle,
    upgradeStat, unlockPitch,
    canUpgradeStat, canUnlockPitch,
  } = usePitcher();
  const [toast, setToast] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  function doUpgrade(stat: keyof PitcherStats) {
    if (upgradeStat(stat)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`${STAT_INFO[stat].label} upgraded! ⬆`);
    }
  }

  function doUnlock(pitch: PitchType) {
    if (unlockPitch(pitch)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`${PITCH_INFO[pitch].name} unlocked!`);
    }
  }

  async function doSetPitchingStyle(style: PitchingStyle) {
    await setPitchingStyle(style);
    Haptics.selectionAsync();
    showToast(style === 'total_control' ? 'Total Control mode on!' : 'Classic mode on!');
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B1E3D', '#162847']} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PITCHER ROOM</Text>
        <View style={styles.pointsPill}>
          <MaterialCommunityIcons name="star" size={14} color="#FFCC00" />
          <Text style={styles.pointsText}>{availablePoints.toLocaleString()}</Text>
        </View>
      </View>

      {toast !== '' && (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileSub}>
            Level {profile.level} · {profile.gamesPlayed} games played
          </Text>
          <Text style={styles.profileHigh}>
            Best: {profile.highScore.toLocaleString()} pts
          </Text>
        </View>

        <Text style={styles.sectionTitle}>PITCHER STATS</Text>

        {(Object.keys(STAT_INFO) as Array<keyof PitcherStats>).map(stat => {
          const info = STAT_INFO[stat];
          const level = profile.stats[stat];
          const upgCount = profile.statUpgradeCounts[stat];
          const maxed = upgCount >= 10;
          const cost = maxed ? 0 : (UPGRADE_COSTS[upgCount] ?? 9999);
          const canAfford = canUpgradeStat(stat);
          return (
            <View key={stat} style={styles.statCard}>
              <View style={styles.statLeft}>
                <MaterialCommunityIcons name={info.icon} size={22} color="#FFCC00" />
                <View style={styles.statTextCol}>
                  <Text style={styles.statName}>{info.label}</Text>
                  <Text style={styles.statDesc}>{info.description}</Text>
                </View>
              </View>
              <View style={styles.statRight}>
                <View style={styles.levelDots}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.lvlDot,
                        { backgroundColor: i < level ? '#FFCC00' : 'rgba(255,255,255,0.12)' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.levelText}>Lv {level}</Text>
                {maxed ? (
                  <View style={styles.maxedPill}>
                    <Text style={styles.maxedText}>MAX</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.upBtn, !canAfford && styles.upBtnDisabled]}
                    onPress={() => doUpgrade(stat)}
                    disabled={!canAfford}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name="arrow-up-circle"
                      size={13}
                      color={canAfford ? '#0B1E3D' : 'rgba(255,255,255,0.3)'}
                    />
                    <Text style={[styles.upBtnCost, !canAfford && styles.disabledText]}>
                      {cost.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>PITCH ARSENAL</Text>

        <View style={styles.pitchGrid}>
          {ALL_UNLOCKABLE.map(pitch => {
            const info = PITCH_INFO[pitch];
            const unlocked = profile.unlockedPitches.includes(pitch);
            const cost = PITCH_UNLOCK_COSTS[pitch];
            const canAfford = canUnlockPitch(pitch);
            return (
              <View
                key={pitch}
                style={[
                  styles.pitchCard,
                  unlocked && { borderColor: info.color + '60' },
                ]}
              >
                <View style={[styles.pitchBadge, { backgroundColor: info.color + '22' }]}>
                  <Text style={[styles.pitchShort, { color: info.color }]}>{info.shortName}</Text>
                </View>
                <Text style={styles.pitchName}>{info.name}</Text>
                <Text style={styles.pitchDesc}>{info.description}</Text>
                {unlocked ? (
                  <View style={[styles.unlockedBadge, { backgroundColor: info.color + '22' }]}>
                    <Text style={[styles.unlockedText, { color: info.color }]}>UNLOCKED ✓</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.unlockBtn, !canAfford && styles.upBtnDisabled]}
                    onPress={() => doUnlock(pitch)}
                    disabled={!canAfford}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name="lock-open-outline"
                      size={12}
                      color={canAfford ? '#0B1E3D' : 'rgba(255,255,255,0.3)'}
                    />
                    <Text style={[styles.unlockCost, !canAfford && styles.disabledText]}>
                      {cost.toLocaleString()} pts
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>PITCHING STYLE</Text>

        <View style={styles.styleCard}>
          <Text style={styles.styleCardDesc}>
            Choose how you throw in-game. Classic uses a power meter + accuracy tap.
            Total Control uses gesture swipes for each pitch type.
          </Text>
          <View style={styles.styleToggleRow}>
            {(['classic', 'total_control'] as PitchingStyle[]).map(style => {
              const isActive = pitchingStyle === style;
              return (
                <TouchableOpacity
                  key={style}
                  style={[styles.styleOption, isActive && styles.styleOptionActive]}
                  onPress={() => doSetPitchingStyle(style)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name={style === 'classic' ? 'gauge' : 'gesture-swipe-down'}
                    size={20}
                    color={isActive ? '#0B1E3D' : 'rgba(255,255,255,0.55)'}
                  />
                  <Text style={[styles.styleOptionText, isActive && styles.styleOptionTextActive]}>
                    {style === 'classic' ? 'Classic' : 'Total Control'}
                  </Text>
                  {isActive && (
                    <MaterialCommunityIcons name="check-circle" size={14} color="#0B1E3D" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {pitchingStyle === 'total_control' && (
            <View style={styles.tcHintBox}>
              <Text style={styles.tcHintText}>
                Swipe to match the ghost guide for each pitch. Speed matters for Changeup and Fastball!
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => router.replace('/game')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF4757']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.playBtnGrad}
          >
            <MaterialCommunityIcons name="baseball" size={22} color="#fff" />
            <Text style={styles.playBtnText}>PLAY BALL</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1E3D' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,204,0,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.3)',
  },
  pointsText: { color: '#FFCC00', fontSize: 14, fontWeight: '900' },
  toastBox: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: '#2ED573',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  toastText: { color: '#0B1E3D', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  scroll: { paddingHorizontal: 16, gap: 8 },
  profileCard: {
    backgroundColor: 'rgba(22,40,71,0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  profileSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  profileHigh: { color: '#FFCC00', fontSize: 14, fontWeight: '700', marginTop: 4 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 4,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22,40,71,0.9)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statTextCol: { flex: 1 },
  statName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  statDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 },
  statRight: { alignItems: 'flex-end', gap: 4 },
  levelDots: { flexDirection: 'row', gap: 2 },
  lvlDot: { width: 6, height: 6, borderRadius: 3 },
  levelText: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700' },
  upBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFCC00',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  upBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  upBtnCost: { color: '#0B1E3D', fontSize: 11, fontWeight: '800' },
  maxedPill: { backgroundColor: 'rgba(46,213,115,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  maxedText: { color: '#2ED573', fontSize: 10, fontWeight: '800' },
  disabledText: { color: 'rgba(255,255,255,0.3)' },
  pitchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pitchCard: {
    width: '47%',
    backgroundColor: 'rgba(22,40,71,0.9)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 6,
  },
  pitchBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  pitchShort: { fontSize: 18, fontWeight: '900' },
  pitchName: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  pitchDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textAlign: 'center' },
  unlockedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  unlockedText: { fontSize: 10, fontWeight: '800' },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFCC00',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unlockCost: { color: '#0B1E3D', fontSize: 10, fontWeight: '800' },
  styleCard: {
    backgroundColor: 'rgba(22,40,71,0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  styleCardDesc: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  styleToggleRow: { flexDirection: 'row', gap: 10 },
  styleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  styleOptionActive: {
    backgroundColor: '#FFCC00',
    borderColor: '#FFCC00',
  },
  styleOptionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '800',
  },
  styleOptionTextActive: { color: '#0B1E3D' },
  tcHintBox: {
    backgroundColor: 'rgba(255,204,0,0.08)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.2)',
  },
  tcHintText: {
    color: 'rgba(255,204,0,0.75)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  playBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 16 },
  playBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  playBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
});
