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
import { SettingsSlider } from '@/components/SettingsSlider';

function difficultyLabel(v: number): string {
  if (v < 0.2) return 'Rookie';
  if (v < 0.4) return 'Easy';
  if (v < 0.6) return 'Pro';
  if (v < 0.8) return 'Veteran';
  return 'All-Star';
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = usePitcher();
  const { playSfx } = useAudio();
  const topPad = Platform.OS === 'web' ? 24 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('@/assets/images/stadium.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(11,30,61,0.7)', 'rgba(11,30,61,0.93)', 'rgba(11,30,61,0.99)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { playSfx('tap'); router.back(); }}
          activeOpacity={0.7}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GAMEPLAY</Text>
          <SettingsSlider
            icon="speedometer"
            label="Difficulty"
            accent="#FF4757"
            value={settings.difficulty}
            valueLabel={difficultyLabel(settings.difficulty)}
            minLabel="Easier"
            maxLabel="Harder"
            onChange={v => updateSettings({ difficulty: v })}
          />
          <Text style={styles.hint}>
            Higher difficulty speeds up the accuracy needle and shrinks the
            strike zone.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AUDIO</Text>
          <SettingsSlider
            icon="music"
            label="Music Volume"
            accent="#FFCC00"
            value={settings.bgmVolume}
            onChange={v => updateSettings({ bgmVolume: v })}
          />
          <View style={styles.divider} />
          <SettingsSlider
            icon="volume-high"
            label="SFX Volume"
            accent="#2ED573"
            value={settings.sfxVolume}
            onChange={v => {
              updateSettings({ sfxVolume: v });
              if (v > 0) playSfx('mitt');
            }}
          />
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => { playSfx('tap'); router.back(); }}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>DONE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1E3D' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 18,
  },
  section: {
    width: '100%',
    backgroundColor: 'rgba(22,40,71,0.9)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    gap: 16,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: -4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,204,0,0.14)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.3)',
  },
  doneBtnText: {
    color: '#FFCC00',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
