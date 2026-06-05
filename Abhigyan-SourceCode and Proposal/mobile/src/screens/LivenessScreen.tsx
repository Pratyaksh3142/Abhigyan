import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import {
  Camera,
  Face
} from 'react-native-vision-camera-face-detector';
import { useNavigation, useRoute, RouteProp, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getAllUsers, saveAuthLog } from '../lib/db';
import { computeSimilarity, generateRandomChallenge } from '../lib/vision';
import { useAppStore } from '../store';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeOutDown,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  useAnimatedStyle,
  useAnimatedProps
} from 'react-native-reanimated';
import { ScanFace } from 'lucide-react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Nav = NativeStackNavigationProp<RootStackParamList, 'Liveness'>;
type Route = RouteProp<RootStackParamList, 'Liveness'>;
type Phase = 'recognizing' | 'challenge' | 'analyzing' | 'success' | 'failed' | 'not_verified';

export function LivenessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { embedding, capturedAt, skipRecognition, matchedName } = route.params;

  const { refreshPendingLogs } = useAppStore();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const isScreenFocused = useIsFocused();

  const [phase, setPhase] = useState<Phase>('recognizing');
  const [matchedUser, setMatchedUser] = useState<{ name: string; id: string; score: number } | null>(
    matchedName ? { name: matchedName, id: 'self', score: 1 } : null
  );
  const matchedUserRef = useRef<{ name: string; id: string; score: number } | null>(matchedUser);
  const isNavigating = useRef(false);
  const isMounted = useRef(true);
  const [challenge, setChallenge] = useState(generateRandomChallenge());
  const challengeRef = useRef(challenge);

  // live status shown to user during analysis
  const [liveStatus, setLiveStatus] = useState('');

  const isAnalyzingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const spinVal = useSharedValue(0);
  const progressVal = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinVal.value}deg` }]
  }));
  const spinStyleReverse = useAnimatedStyle(() => ({
    transform: [{ rotate: `-${spinVal.value}deg` }]
  }));
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressVal.value * 100}%`
  }));
  const animatedTextProps = useAnimatedProps(() => ({
    text: `${Math.round(progressVal.value * 100)}%`
  } as any));

  useEffect(() => {
    isMounted.current = true;
    if (!hasPermission) requestPermission();
    spinVal.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      isMounted.current = false;
      isAnalyzingRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    challengeRef.current = challenge;
  }, [challenge]);

  useEffect(() => {
    if (skipRecognition) {
      setPhase('challenge');
    } else if (hasPermission) {
      runRecognition();
    }
  }, [hasPermission]);

  async function runRecognition() {
    try {
      await new Promise(r => setTimeout(r, 1200));
      const users = await getAllUsers();
      const queryVec = new Float32Array(embedding);

      let highestScore = 0;
      let matched = null;

      for (const user of users) {
        if (!user.vector) continue;
        const storedVec = new Float32Array(user.vector as unknown as number[]);
        const score = computeSimilarity(queryVec, storedVec);
        if (score > 0.70 && score > highestScore) {
          highestScore = score;
          matched = { name: user.name, id: user.id, score };
        }
      }

      if (!matched) {
        await saveAuthLog({
          id: Date.now().toString(),
          userId: 'UNKNOWN',
          timestamp: capturedAt,
          status: 'failed',
          confidenceScore: 0,
        });
        await refreshPendingLogs();
        if (isMounted.current) {
          setPhase('not_verified');
        }
        return;
      }

      if (isMounted.current) {
        setMatchedUser(matched);
        matchedUserRef.current = matched;
        await new Promise(r => setTimeout(r, 600));
        setPhase('challenge');
      }
    } catch (err) {
      console.error('[Liveness] Recognition error:', err);
      if (isMounted.current) setPhase('failed');
    }
  }

  const handleSuccessLiveness = useCallback(async () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    isAnalyzingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (matchedUserRef.current) {
      await saveAuthLog({
        id: `LOG-${Date.now()}`,
        userId: matchedUserRef.current.id,
        timestamp: Date.now(),
        status: 'success',
        confidenceScore: matchedUserRef.current.score,
      });
      refreshPendingLogs();
    }

    progressVal.value = withTiming(1, { duration: 300 });
    if (isMounted.current) setPhase('success');

    setTimeout(() => {
      navigation.navigate('Dashboard');
    }, 1200);
  }, []);

  // Called by Camera every frame — native speed, no file I/O
  const handleFacesDetected = useCallback((faces: Face[]) => {
    if (!isAnalyzingRef.current || faces.length === 0) return;

    const face = faces[0];
    const id = challengeRef.current.id;
    let passed = false;

    if (id === 'smile') {
      const prob = face.smilingProbability ?? 0;
      // Update live hint
      if (prob > 0.35) setLiveStatus('😊 Keep smiling...');
      passed = prob > 0.75;
    } else if (id === 'blink') {
      const leftOpen = face.leftEyeOpenProbability ?? 1;
      const rightOpen = face.rightEyeOpenProbability ?? 1;
      if (leftOpen < 0.5 && rightOpen < 0.5) setLiveStatus('👁 Almost there...');
      passed = leftOpen < 0.15 && rightOpen < 0.15;
    } else if (id === 'turn_head') {
      const yaw = face.yawAngle ?? 0;
      if (Math.abs(yaw) > 10) setLiveStatus('↩ Keep turning...');
      passed = Math.abs(yaw) > 25;
    }

    if (passed) {
      handleSuccessLiveness();
    }
  }, [handleSuccessLiveness]);

  const startAnalyzing = () => {
    isAnalyzingRef.current = true;
    setLiveStatus('');
    setPhase('analyzing');
    progressVal.value = 0;
    progressVal.value = withTiming(0.95, { duration: 6000, easing: Easing.linear });

    // Timeout after 6 seconds
    timeoutRef.current = setTimeout(() => {
      if (isAnalyzingRef.current && isMounted.current) {
        isAnalyzingRef.current = false;
        setPhase('failed');
      }
    }, 6000);
  };

  const retryChallenge = () => {
    isNavigating.current = false;
    isAnalyzingRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const newChallenge = generateRandomChallenge();
    setChallenge(newChallenge);
    challengeRef.current = newChallenge;
    setPhase('challenge');
    setLiveStatus('');
  };

  if (!hasPermission || !device) {
    return <View style={styles.container} />;
  }

  // Camera is active during recognizing, challenge preview, and analyzing
  const cameraActive = isScreenFocused && (phase === 'recognizing' || phase === 'challenge' || phase === 'analyzing');

  return (
    <SafeAreaView style={styles.container}>
      {/* Native face detector Camera — fires onFacesDetected every frame, no worklets */}
      <View style={StyleSheet.absoluteFill}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
          runClassifications
          performanceMode="fast"
          onFacesDetected={handleFacesDetected}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Liveness Test</Text>
      </View>

      <View style={styles.bottomContainer}>
        <Animated.View entering={FadeInUp} style={styles.cardContainer}>
          <BlurView intensity={80} tint="light" style={styles.glassCard}>

            {phase === 'recognizing' && (
              <View style={styles.contentWrapper}>
                <View style={styles.loaderContainer}>
                  <Animated.View style={[styles.outerRing, spinStyle]} />
                  <Animated.View style={[styles.innerRing, spinStyleReverse]} />
                </View>
                <Text style={styles.title}>Security Protocol</Text>
                <Text style={styles.subtitle}>Analyzing biometric feed...</Text>
              </View>
            )}

            {phase === 'challenge' && (
              <View style={styles.contentWrapper}>
                <View style={styles.loaderContainer}>
                  <ScanFace color="#000" size={32} />
                </View>
                <Text style={styles.title}>Action Required</Text>
                <Text style={styles.subtitle}>Perform this action when ready:</Text>

                <Animated.View entering={FadeInDown} style={styles.challengeBox}>
                  <Text style={styles.challengeText}>{challenge.label}</Text>
                </Animated.View>

                <TouchableOpacity style={styles.readyBtn} onPress={startAnalyzing}>
                  <Text style={styles.readyBtnText}>Start — I'm Ready</Text>
                </TouchableOpacity>
              </View>
            )}

            {phase === 'analyzing' && (
              <View style={styles.contentWrapper}>
                <View style={styles.loaderContainer}>
                  <Animated.View style={[styles.outerRing, spinStyle]} />
                  <Animated.View style={[styles.innerRing, spinStyleReverse]} />
                </View>
                <Text style={styles.title}>Detecting...</Text>
                <Text style={styles.challengeHint}>{challenge.label}</Text>

                {liveStatus ? (
                  <Animated.Text entering={FadeInDown} style={styles.liveStatus}>
                    {liveStatus}
                  </Animated.Text>
                ) : null}

                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, progressStyle]} />
                  </View>
                  <AnimatedTextInput
                    editable={false}
                    animatedProps={animatedTextProps}
                    style={styles.progressPercentage}
                  />
                </View>
              </View>
            )}

            {phase === 'success' && (
              <Animated.View entering={FadeInDown} style={styles.contentWrapper}>
                <View style={styles.successIconBox}>
                  <Text style={styles.iconText}>✓</Text>
                </View>
                <Text style={styles.title}>Verified</Text>
                {matchedUser && (
                  <Text style={styles.matchName}>{matchedUser.name}</Text>
                )}
                <View style={styles.accessBadge}>
                  <Text style={styles.accessBadgeText}>ACCESS GRANTED</Text>
                </View>
              </Animated.View>
            )}

            {phase === 'failed' && (
              <Animated.View entering={FadeInDown} style={styles.contentWrapper}>
                <View style={styles.failIconBox}>
                  <Text style={[styles.iconText, { color: '#333' }]}>✗</Text>
                </View>
                <Text style={styles.title}>Face Not Detected</Text>
                <Text style={styles.subtitle}>Could not verify liveness challenge.</Text>

                <TouchableOpacity style={styles.retryBtn} onPress={retryChallenge}>
                  <Text style={styles.retryBtnText}>Retry Challenge</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Dashboard')}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {phase === 'not_verified' && (
              <Animated.View entering={FadeInDown} style={styles.contentWrapper}>
                <View style={styles.failIconBox}>
                  <Text style={[styles.iconText, { color: '#333' }]}>✗</Text>
                </View>
                <Text style={styles.title}>Face Not Verified</Text>
                <Text style={styles.subtitle}>No matching biometric signature found. Please register first.</Text>

                <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.replace('Register')}>
                  <Text style={styles.retryBtnText}>Go to Registration</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.navigate('Dashboard')}>
                  <Text style={styles.cancelBtnText}>Back to Dashboard</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

          </BlurView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  cardContainer: {
    width: '100%', maxWidth: 400,
    borderRadius: 44,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  glassCard: {
    padding: 32,
    alignItems: 'center',
  },
  contentWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  loaderContainer: {
    width: 64, height: 64,
    marginBottom: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: '100%', height: '100%',
    top: 0, left: 0,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    borderTopColor: 'rgba(0,0,0,0.4)',
  },
  innerRing: {
    position: 'absolute',
    width: 32, height: 32,
    top: 16, left: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    borderStyle: 'dashed',
  },
  progressContainer: {
    width: '100%',
    marginTop: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    marginTop: 8,
  },
  title: {
    fontSize: 20, fontWeight: '600', color: '#000', marginBottom: 6, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13, color: '#666', marginBottom: 20, textAlign: 'center',
  },
  challengeHint: {
    fontSize: 15, color: '#444', marginBottom: 12, textAlign: 'center', fontWeight: '500',
  },
  liveStatus: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  challengeBox: {
    backgroundColor: '#000',
    borderRadius: 24,
    paddingVertical: 20, paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  challengeText: {
    color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 0.5,
  },
  readyBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    width: '100%',
    borderRadius: 20,
    alignItems: 'center',
  },
  readyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  successIconBox: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  failIconBox: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  iconText: {
    fontSize: 40, color: '#fff',
  },
  matchName: {
    fontSize: 16, fontWeight: '500', color: '#666', marginBottom: 12,
  },
  accessBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8,
  },
  accessBadgeText: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2, color: '#000',
  },
});
