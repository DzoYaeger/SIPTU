import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Jalankan animasi fade in halus selama 1500ms, lalu tahan 500ms
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.delay(500),
    ]).start(() => {
      // Panggil callback saat animasi selesai
      onAnimationFinish();
    });
  }, [fadeAnim, onAnimationFinish]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Image
          source={require('../../assets/iconsiptu.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
  },
});
