import React, { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SettingsSliderProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  /** Current value, 0…1. */
  value: number;
  onChange: (value: number) => void;
  /** Right-side readout. Defaults to a percentage. */
  valueLabel?: string;
  accent?: string;
  /** Optional tick labels shown under the track (e.g. Easy … Hard). */
  minLabel?: string;
  maxLabel?: string;
}

const THUMB = 26;

export function SettingsSlider({
  icon,
  label,
  value,
  onChange,
  valueLabel,
  accent = '#FFCC00',
  minLabel,
  maxLabel,
}: SettingsSliderProps) {
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);

  const setFromX = (x: number) => {
    const w = trackWRef.current;
    if (w <= 0) return;
    const clamped = Math.max(0, Math.min(w, x));
    onChange(clamped / w);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: e => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWRef.current = w;
    setTrackW(w);
  };

  const pct = Math.round(value * 100);
  const fillW = trackW * value;
  const thumbLeft = Math.max(0, Math.min(trackW - THUMB, fillW - THUMB / 2));

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <MaterialCommunityIcons name={icon} size={20} color={accent} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.value, { color: accent }]}>
          {valueLabel ?? `${pct}%`}
        </Text>
      </View>

      <View
        style={styles.track}
        onLayout={onLayout}
        {...responder.panHandlers}
      >
        <View style={styles.trackBg} />
        <LinearGradient
          colors={[accent, accent]}
          style={[styles.fill, { width: fillW }]}
        />
        <View style={[styles.thumb, { left: thumbLeft, borderColor: accent }]} />
      </View>

      {(minLabel || maxLabel) && (
        <View style={styles.ticks}>
          <Text style={styles.tick}>{minLabel}</Text>
          <Text style={styles.tick}>{maxLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', gap: 10 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  value: { fontSize: 15, fontWeight: '900' },
  track: {
    height: THUMB,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ticks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  tick: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
});
