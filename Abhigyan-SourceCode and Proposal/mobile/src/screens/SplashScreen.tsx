import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { ScanFace } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSpring, 
  Easing,
  FadeInUp,
  FadeOutUp
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const INTRO_TEXTS = [
  "Secure Check",
  "Offline System",
  "Private & Fast",
  "Loading..."
];

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const [textIndex, setTextIndex] = useState(0);

  const rotateOuter = useSharedValue(0);
  const rotateInner = useSharedValue(0);
  const scaleCenter = useSharedValue(0.8);

  useEffect(() => {
    // Start continuous rotations
    rotateOuter.value = withRepeat(
      withTiming(360, { duration: 15000, easing: Easing.linear }), 
      -1
    );
    rotateInner.value = withRepeat(
      withTiming(-360, { duration: 12000, easing: Easing.linear }), 
      -1
    );

    // Spring center icon
    scaleCenter.value = withSpring(1, { damping: 20, stiffness: 100 });

    const interval = setInterval(() => {
      setTextIndex(prev => (prev < INTRO_TEXTS.length - 1 ? prev + 1 : prev));
    }, 1200);

    const timer = setTimeout(() => {
      navigation.replace('SupervisorLogin');
    }, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [navigation]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateOuter.value}deg` }]
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateInner.value}deg` }]
  }));
  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleCenter.value }]
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Animated Icon Group */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.ringOuter, outerStyle]} />
          <Animated.View style={[styles.ringInner, innerStyle]} />
          
          <Animated.View style={[styles.centerBox, centerStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            />
            <ScanFace color="#fff" size={40} strokeWidth={1} />
          </Animated.View>
        </View>

        {/* Text Sequence */}
        <View style={styles.textContainer}>
          <Animated.Text 
            key={textIndex}
            entering={FadeInUp.duration(300).delay(200)}
            exiting={FadeOutUp.duration(200)}
            style={[styles.text, textIndex === 0 ? styles.textLarge : styles.textSmall, { position: 'absolute' }]}
          >
            {INTRO_TEXTS[textIndex]}
          </Animated.Text>
        </View>

      </View>
      
      {/* Loading Spinner */}
      <View style={styles.footer}>
        <View style={styles.spinner} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  iconContainer: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ringOuter: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    borderRadius: 64,
  },
  ringInner: {
    position: 'absolute',
    top: 12, bottom: 12, left: 12, right: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRightColor: 'rgba(0,0,0,0.1)',
    borderRadius: 52,
  },
  centerBox: {
    width: 80,
    height: 80,
    backgroundColor: '#000',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  textLarge: {
    fontSize: 24,
  },
  textSmall: {
    fontSize: 18,
    color: '#525252',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  spinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    borderTopColor: '#000',
    borderRadius: 10,
  }
});
