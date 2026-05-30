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
      <LinearGradient
        colors={['rgba(11,30,61,0.25)', 'rgba(11,30,61,0.05)', 'rgba(11,30,61,0.75)']}
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
