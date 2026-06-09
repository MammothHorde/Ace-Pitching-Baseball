import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePitcher } from '@/context/PitcherContext';
import { SaveResult } from '@/constants/GameTypes';

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const {
    score: scoreParam,
    saveResult: saveResultParam,
    scenarioLabel: scenarioLabelParam,
    gameMode: gameModeParam,
  } = useLocalSearchParams<{
    score: string;
    saveResult?: string;
    scenarioLabel?: string;
    gameMode?: string;
  }>();

  const finalScore = parseInt(scoreParam ?? '0', 10);
  const { profile } = usePitcher();
  const isNewHigh = finalScore > 0 && finalScore >= profile.highScore;
  const isCloser = gameModeParam === 'closer';
  const saveResult = (saveResultParam ?? 'none') as SaveResult;
  const scenarioLabel = scenarioLabelParam ?? '';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
      }),
    ]).start();
    if (isCloser) {
      Animated.spring(badgeScaleAnim, {
        toValue: 1, useNativeDriver: true, tension: 60, friction: 7, delay: 300,
      }).start();
    }
  }, []);

  const BADGE_CONFIG = {
    save: {
      label: 'SAVE',
      icon: 'shield-check' as const,
      colors: ['#1B6B2E', '#28A745'] as [string, string],
      borderColor: 'rgba(40,167,69,0.5)',
      textColor: '#4CD964',
    },
    hold: {
      label: 'HOLD',
      icon: 'lock' as const,
      colors: ['#1A3A6B', '#2563EB'] as [string, string],
      borderColor: 'rgba(37,99,235,0.5)',
      textColor: '#5AC8FA',
    },
    blown_save: {
      label: 'BLOWN SAVE',
      icon: 'fire' as const,
      colors: ['#6B1A1A', '#DC2626'] as [string, string],
      borderColor: 'rgba(220,38,38,0.5)',
      textColor: '#FF4757',
    },
    none: null,
  };

  const badgeCfg = isCloser ? BADGE_CONFIG[saveResult] : null;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/stadium.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(11,30,61,0.65)', 'rgba(11,30,61,0.96)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          { paddingTop: topPad + 40, paddingBottom: bottomPad + 24, opacity: fadeAnim },
        ]}
      >
        <Animated.View style={[styles.topSection, { transform: [{ scale: scaleAnim }] }]}>
          <MaterialCommunityIcons
            name={isCloser ? 'fire' : 'baseball'}
            size={56}
            color={isCloser ? (saveResult === 'blown_save' ? '#FF4757' : '#5AC8FA') : '#FF4757'}
          />
          <Text style={styles.gameOver}>{isCloser ? (saveResult === 'blown_save' ? 'BLOWN SAVE' : 'GAME OVER') : 'GAME OVER'}</Text>

          {/* Save/Hold/Blown Save badge for Closer mode */}
          {badgeCfg && (
            <Animated.View style={[
              styles.saveBadgeWrap,
              { transform: [{ scale: badgeScaleAnim }] },
            ]}>
              <LinearGradient
                colors={badgeCfg.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.saveBadge, { borderColor: badgeCfg.borderColor }]}
              >
                <MaterialCommunityIcons name={badgeCfg.icon} size={22} color={badgeCfg.textColor} />
                <Text style={[styles.saveBadgeText, { color: badgeCfg.textColor }]}>
                  {badgeCfg.label}
                </Text>
              </LinearGradient>
              {scenarioLabel ? (
                <Text style={styles.scenarioLabel}>{scenarioLabel}</Text>
              ) : null}
            </Animated.View>
          )}

          {isNewHigh && (
            <View style={styles.newHighBadge}>
              <Text style={styles.newHighText}>🏆 NEW HIGH SCORE!</Text>
            </View>
          )}

          <Text style={styles.finalLabel}>FINAL SCORE</Text>
          <Text style={styles.finalScore}>{finalScore.toLocaleString()}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>HIGH SCORE</Text>
              <Text style={styles.statValue}>{profile.highScore.toLocaleString()}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>GAMES</Text>
              <Text style={styles.statValue}>{profile.gamesPlayed}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>LEVEL</Text>
              <Text style={styles.statValue}>{profile.level}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.btnSection}>
          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={() => router.replace({
              pathname: '/game',
              params: isCloser ? { mode: 'closer' } : { mode: 'classic' },
            })}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isCloser ? ['#1A3A6B', '#0F2547'] : ['#FF6B6B', '#FF4757']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              <MaterialCommunityIcons
                name={isCloser ? 'fire' : 'baseball'}
                size={22}
                color={isCloser ? '#5AC8FA' : '#fff'}
              />
              <Text style={[styles.btnText, isCloser && { color: '#5AC8FA' }]}>
                {isCloser ? 'NEW SAVE SITUATION' : 'PLAY AGAIN'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => router.replace('/upgrade')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="trophy" size={20} color="#FFCC00" />
            <Text style={styles.upgradeBtnText}>UPGRADE PITCHER</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={styles.homeBtnText}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1E3D' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  topSection: { alignItems: 'center', gap: 10 },
  gameOver: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', letterSpacing: 3 },
  saveBadgeWrap: { alignItems: 'center', gap: 4 },
  saveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  saveBadgeText: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  scenarioLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  newHighBadge: {
    backgroundColor: 'rgba(255,204,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.5)',
  },
  newHighText: { color: '#FFCC00', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  finalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  finalScore: { color: '#FFCC00', fontSize: 72, fontWeight: '900', lineHeight: 80 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22,40,71,0.85)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 4 },
  btnSection: { gap: 10 },
  playAgainBtn: { borderRadius: 18, overflow: 'hidden' },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,204,0,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.3)',
  },
  upgradeBtnText: { color: '#FFCC00', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  homeBtn: { alignItems: 'center', paddingVertical: 12 },
  homeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
});
