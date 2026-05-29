import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

export function AppSplashScreen() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(16)).current;
  const lineOpacity = useRef(new Animated.Value(0)).current;
  const lineScale = useRef(new Animated.Value(0.3)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(logoY, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ]),
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(lineOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(lineScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(taglineY, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.Text style={[styles.logo, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
          Candor
        </Animated.Text>

        <Animated.View style={[styles.divider, { opacity: lineOpacity, transform: [{ scaleX: lineScale }] }]} />

        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
          your honest daily record
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 22,
  },
  logo: {
    fontSize: 48,
    fontWeight: '300',
    color: Colors.text.primary,
    letterSpacing: 8,
    fontFamily: 'Georgia',
  },
  divider: {
    width: 36,
    height: 1,
    backgroundColor: Colors.accent.terracotta,
    opacity: 0.6,
  },
  tagline: {
    fontSize: 13,
    color: Colors.text.muted,
    letterSpacing: 2,
    fontWeight: '400',
  },
});
