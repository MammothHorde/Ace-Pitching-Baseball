import React from 'react';
import {
  ImageBackground,
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
import { usePitcher } from '@/context/PitcherContext';
import { useAudio } from '@/context/AudioContext';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, isLoading } = usePitcher();
  const { playSfx } = useAudio();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('@/assets/images/stadium.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(11,30,61,0.55)', 'rgba(11,30,61,0.88)', 'rgba(11,30,61,0.98)']}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        style={[styles.gearBtn, { top: topPad + 4 }]}
        onPress={() => { playSfx('tap'); router.push('/settings'); }}
        activeOpacity={0.7}
        hitSlop={10}
      >
        <MaterialCommunityIcons name="cog" size={24} color="rgba(255,255,255,0.85)" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 20, paddingBottom: bottomPad + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoBlock}>
          <MaterialCommunityIcons name="baseball" size={68} color="#FF4757" />
          <Text style={styles.title}>ACE PITCHING</Text>
          <Text style={styles.titleAccent}>BASEBALL</Text>
          <Text style={styles.tagline}>Show 'em what you've got!</Text>
        </View>

        {!isLoading && (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.cardName}>{profile.name}</Text>
                <Text style={styles.cardSub}>
                  Level {profile.level} Pitcher · {profile.gamesPlayed} games
                </Text>
              </View>
              <View style={styles.highBlock}>
                <Text style={styles.highLabel}>BEST</Text>
                <Text style={styles.highScore}>{profile.highScore.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              {[
                { key: 'SPD', val: profile.stats.speed },
                { key: 'ACC', val: profile.stats.accuracy },
                { key: 'STA', val: profile.stats.stamina },
                { key: 'SPN', val: profile.stats.spin },
              ].map(s => (
                <View key={s.key} style={styles.statBox}>
                  <Text style={styles.statKey}>{s.key}</Text>
                  <Text style={styles.statVal}>{s.val}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.arsenalText}>
              Arsenal: {profile.unlockedPitches.length} pitches unlocked
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => { playSfx('tap'); router.push('/game'); }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF4757']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.playBtnGrad}
          >
            <MaterialCommunityIcons name="baseball" size={28} color="#fff" />
            <Text style={styles.playBtnText}>PLAY BALL</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => { playSfx('tap'); router.push('/upgrade'); }}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="trophy" size={22} color="#FFCC00" />
          <Text style={styles.upgradeBtnText}>PITCHER ROOM</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => { playSfx('tap'); router.push('/settings'); }}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="cog" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.settingsBtnText}>SETTINGS</Text>
        </TouchableOpacity>

        <View style={styles.howBox}>
          <Text style={styles.howTitle}>HOW TO PLAY</Text>
          {[
            { n: 1, text: 'Tap a zone on the strike zone grid to target it' },
            { n: 2, text: 'Choose your pitch type from your arsenal' },
            { n: 3, text: 'Press & HOLD — release when power hits the green zone!' },
            { n: 4, text: 'TAP anywhere to stop the needle near center for perfect aim' },
          ].map(s => (
            <View key={s.n} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumTxt}>{s.n}</Text>
              </View>
              <Text style={styles.stepTxt}>{s.text}</Text>
            </View>
          ))}
          <Text style={styles.tip}>
            Tip: Mix pitch types and locations for COMBO multipliers!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1E3D' },
  scroll: { paddingHorizontal: 24, alignItems: 'center', gap: 14 },
  logoBlock: { alignItems: 'center' },
  title: {
    fontSize: 54, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4, lineHeight: 58,
    textAlign: 'center',
  },
  titleAccent: {
    fontSize: 54, fontWeight: '900', color: '#FF4757', letterSpacing: 4, marginTop: -6,
    textAlign: 'center',
  },
  tagline: { color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: '600', marginTop: 8 },
  card: {
    width: '100%',
    backgroundColor: 'rgba(22,40,71,0.9)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  cardSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  highBlock: { alignItems: 'flex-end' },
  highLabel: { color: 'rgba(255,204,0,0.65)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  highScore: { color: '#FFCC00', fontSize: 24, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center',
  },
  statKey: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  arsenalText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', marginTop: 10 },
  playBtn: { width: '100%', borderRadius: 22, overflow: 'hidden' },
  playBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 22, gap: 12,
  },
  playBtnText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  upgradeBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,204,0,0.12)',
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.3)',
  },
  upgradeBtnText: { color: '#FFCC00', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  settingsBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  settingsBtnText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '800', letterSpacing: 1,
  },
  gearBtn: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,30,61,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  howBox: {
    width: '100%',
    backgroundColor: 'rgba(22,40,71,0.8)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  howTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4757',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  stepTxt: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1, lineHeight: 19, fontWeight: '500',
  },
  tip: {
    color: '#FFCC00', fontSize: 12, textAlign: 'center',
    fontWeight: '700', fontStyle: 'italic', marginTop: 4,
  },
});
