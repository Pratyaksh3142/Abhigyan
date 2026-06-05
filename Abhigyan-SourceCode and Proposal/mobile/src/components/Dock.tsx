import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Home, Settings as SettingsIcon, UserPlus } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function DockItem({ 
  icon: Icon, 
  isActive, 
  onPress, 
  isCenter = false 
}: { 
  icon: any, 
  isActive: boolean, 
  onPress: () => void, 
  isCenter?: boolean 
}) {
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const color = isActive ? (isCenter ? '#fff' : '#2563eb') : '#9ca3af';

  if (isCenter) {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[styles.centerItem, style, isActive && styles.centerItemActive]}
      >
        {isActive ? (
          <LinearGradient
            colors={['#262626', '#000000']}
            style={styles.centerGradient}
          >
            <Icon color={color} size={24} strokeWidth={2.5} />
          </LinearGradient>
        ) : (
          <Icon color={color} size={24} strokeWidth={2.5} />
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.sideItem, style, isActive && styles.sideItemActive]}
    >
      <Icon color={color} size={20} strokeWidth={2.5} />
    </AnimatedPressable>
  );
}

export function Dock() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();

  return (
    <View style={styles.positioner}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.innerContainer}>
          <DockItem 
            icon={UserPlus} 
            isActive={route.name === 'Register'} 
            onPress={() => navigation.navigate('Register')} 
          />
          <DockItem 
            icon={Home} 
            isActive={route.name === 'Dashboard'} 
            onPress={() => navigation.navigate('Dashboard')} 
            isCenter
          />
          <DockItem 
            icon={SettingsIcon} 
            isActive={route.name === 'Settings'} 
            onPress={() => navigation.navigate('Settings')} 
          />
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  blurContainer: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  innerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  sideItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  centerItem: {
    width: 56,
    height: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerItemActive: {
    transform: [{ translateY: -4 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  centerGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
