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

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { score: scoreParam } = useLocalSearchParams<{ score: string }>();
  const finalScore = parseInt(scoreParam ?? '0', 10);
  const { profile } = usePitcher();
  const isNewHigh = finalScore > 0 && finalScore >= profile.highScore;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
      }),
    ]).start();
  }, []);

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
          <MaterialCommunityIcons name="baseball" size={56} color="#FF4757" />
          <Text style={styles.gameOver}>GAME OVER</Text>

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
            onPress={() => router.replace('/game')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF4757']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGrad}
            >
              <MaterialCommunityIcons name="baseball" size={22} color="#fff" />
              <Text style={styles.btnText}>PLAY AGAIN</Text>
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
