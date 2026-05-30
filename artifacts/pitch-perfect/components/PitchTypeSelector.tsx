import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PitchType } from '@/constants/GameTypes';
import { PITCH_INFO } from '@/utils/gameLogic';

interface Props {
  arsenal: PitchType[];
  selectedPitch: PitchType | null;
  onSelectPitch: (pitch: PitchType) => void;
  disabled?: boolean;
}

function Dots({ count, filled, color }: { count: number; filled: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: i < filled ? color : 'rgba(255,255,255,0.18)',
          }}
        />
      ))}
    </View>
  );
}

export function PitchTypeSelector({ arsenal, selectedPitch, onSelectPitch, disabled }: Props) {
  return (
    <View>
      <Text style={styles.header}>PITCH TYPE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {arsenal.map(pitch => {
          const info = PITCH_INFO[pitch];
          const sel = selectedPitch === pitch;
          return (
            <TouchableOpacity
              key={pitch}
              style={[
                styles.card,
                { borderColor: sel ? info.color : 'rgba(255,255,255,0.12)' },
                sel && { backgroundColor: info.color + '28' },
              ]}
              onPress={() => !disabled && onSelectPitch(pitch)}
              activeOpacity={0.7}
            >
              <Text style={[styles.shortName, { color: sel ? info.color : 'rgba(255,255,255,0.55)' }]}>
                {info.shortName}
              </Text>
              <Text style={[styles.name, { color: sel ? '#fff' : 'rgba(255,255,255,0.45)' }]}>
                {info.name}
              </Text>
              <View style={styles.dotsSection}>
                <Dots count={5} filled={info.speedRating} color={info.color} />
                <Dots count={5} filled={info.movementRating} color={info.color} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(22,40,71,0.92)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 70,
    gap: 2,
  },
  shortName: { fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  name: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
  dotsSection: { gap: 3, marginTop: 4, alignItems: 'flex-start' },
});
