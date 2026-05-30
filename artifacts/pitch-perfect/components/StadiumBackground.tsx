import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export function StadiumBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={require('@/assets/images/stadium.png')}
        style={styles.image}
        resizeMode="cover"
      />
      {/* Top: let stadium show through. Bottom: darken for UI panel. */}
      <LinearGradient
        colors={[
          'rgba(11,30,61,0.30)',
          'rgba(11,30,61,0.10)',
          'rgba(11,30,61,0.40)',
          'rgba(11,30,61,0.82)',
          'rgba(11,30,61,0.96)',
        ]}
        locations={[0, 0.20, 0.45, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width,
    height,
    position: 'absolute',
  },
});
