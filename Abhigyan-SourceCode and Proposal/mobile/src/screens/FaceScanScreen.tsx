import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import { useMemo } from 'react';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { extractFaceEmbedding, loadModels } from '../lib/vision';
import { ScanFace, SwitchCamera } from 'lucide-react-native';
import { TopBar } from '../components/TopBar';
import Animated, { 
  FadeIn, Easing, useSharedValue, cancelAnimation,
  withRepeat, withTiming, useAnimatedStyle 
} from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FaceScan'>;

const { height: windowHeight } = Dimensions.get('window');

const TARGET_RESOLUTION = { width: 1280, height: 720 };

export function FaceScanScreen() {
  const navigation = useNavigation<Nav>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [scanning, setScanning] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [facingMode, setFacingMode] = useState<'front' | 'back'>('front');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');

  const device = useCameraDevice(facingMode);
  const photoOutput = usePhotoOutput({ targetResolution: TARGET_RESOLUTION });
  const outputs = useMemo(() => [photoOutput], [photoOutput]);

  const progressVal = useSharedValue(0);
  const breathingVal = useSharedValue(1);
  const cameraRef = useRef<Camera>(null);
  const isFocused = useIsFocused();
  const isMounted = useRef(true);

  useEffect(() => {
    breathingVal.value = withRepeat(
      withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(breathingVal);
  }, []);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    loadModels()
      .then(() => setModelsLoaded(true))
      .catch(err => console.error('[FaceScan] Model load failed:', err));
  }, []);

  // Reset state every time this screen comes back into focus
  useEffect(() => {
    if (isFocused) {
      setCapturedPhoto(null);
      setScanning(false);
      progressVal.value = 0;
    }
  }, [isFocused]);

  async function handleCapture() {
    if (!cameraRef.current) return;
    setScanning(true);
    try {
      setProgressText('📸 Capturing face snapshot...');
      const photo = await photoOutput.capturePhotoToFile({}, {});
      if (!isMounted.current) return;

      const imageUri = photo.filePath.startsWith('file://')
        ? photo.filePath
        : 'file://' + photo.filePath;
      setCapturedPhoto(imageUri);

      setProgressText('🧬 Extracting biometric features...');
      await new Promise(resolve => setTimeout(resolve, 200));
      if (!isMounted.current) return;

      progressVal.value = 0;
      progressVal.value = withTiming(0.95, { duration: 3000, easing: Easing.out(Easing.cubic) });

      const embedding = await extractFaceEmbedding(imageUri);
      if (!isMounted.current) return;

      navigation.navigate('Liveness', {
        embedding: Array.from(embedding),
        capturedAt: Date.now()
      });
    } catch (err: any) {
      if (isMounted.current) {
        Alert.alert('Face Detection Failed', err.message || 'Could not detect a face. Please try again.');
        setCapturedPhoto(null);
      }
    } finally {
      if (isMounted.current) {
        setScanning(false);
      }
    }
  }

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressVal.value * 100}%`
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingVal.value }],
    opacity: 0.6 - (progressVal.value * 0.4)
  }));

  function toggleCamera() {
    setFacingMode(prev => prev === 'front' ? 'back' : 'front');
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="Face Scan" />
        <View style={styles.permissionBox}>
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permSub}>FaceGuard needs camera access for facial recognition.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) return <View style={styles.container} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title="Face Scan" />

      {/* Camera — always mounted, never unmounts during capture */}
      <View style={capturedPhoto ? styles.cameraWrapperHidden : styles.cameraWrapper}>
        {isFocused && (
          <Camera
            key={facingMode}
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={isFocused && !capturedPhoto}
            outputs={outputs}
          />
        )}

        {/* Camera Overlay — only visible when camera is showing */}
        {!capturedPhoto && (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.overlay}>

              {/* Top Indicators */}
              <View style={styles.topOverlay}>
                <View style={styles.recBadge}>
                  <View style={styles.recDot} />
                  <Text style={styles.recText}>REC</Text>
                </View>
                <TouchableOpacity style={styles.switchCamBtn} onPress={toggleCamera}>
                  <SwitchCamera color="#fff" size={20} />
                </TouchableOpacity>
              </View>

              {/* Corner brackets */}
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />

              {/* FPS Indicator */}
              <View style={styles.fpsBadge}>
                <Text style={styles.fpsText}>FPS: 30</Text>
              </View>

              {/* Center oval */}
              <View style={styles.scanArea}>
                <View style={styles.ovalFrame} />
                <View style={styles.centerDot} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Processing panel — overlays on top when photo captured */}
      {capturedPhoto && (
        <Animated.View entering={FadeIn} style={styles.processingPanel}>
          <View style={styles.photoFrameContainer}>
            <Animated.View style={[styles.glowRing, glowStyle]} />
            <Animated.Image source={{ uri: capturedPhoto }} style={styles.processingPhoto} />
          </View>
          <Text style={styles.processingTitle}>Verifying Identity</Text>
          <Text style={styles.processingSubtitle}>{progressText}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, progressStyle]} />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Bottom controls — only when camera is showing */}
      {!capturedPhoto && (
        <View style={styles.bottomSection}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Identity Scan</Text>
            <Text style={styles.subtitle}>Position face in the frame</Text>
          </View>

          <TouchableOpacity
            style={[styles.captureBtn, scanning && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={scanning || !modelsLoaded}
          >
            {scanning ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <ScanFace color="#fff" size={20} strokeWidth={1.5} style={{ marginRight: 8 }} />
                <Text style={styles.captureBtnText}>Match Face</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const CORNER = 40;
const BORDER = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  cameraWrapper: {
    height: windowHeight * 0.6,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraWrapperHidden: {
    height: 0,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
  overlay: { flex: 1 },
  topOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 32,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff4444' },
  recText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  switchCamBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff', borderRadius: 12,
  },
  tl: { top: 120, left: 40, borderTopWidth: BORDER, borderLeftWidth: BORDER },
  tr: { top: 120, right: 40, borderTopWidth: BORDER, borderRightWidth: BORDER },
  bl: { bottom: 60, left: 40, borderBottomWidth: BORDER, borderLeftWidth: BORDER },
  br: { bottom: 60, right: 40, borderBottomWidth: BORDER, borderRightWidth: BORDER },
  fpsBadge: {
    position: 'absolute', bottom: 70, right: 55,
  },
  fpsText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  scanArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  ovalFrame: {
    width: 200, height: 260,
    borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  centerDot: {
    position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  bottomSection: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', fontWeight: '400' },
  captureBtn: {
    backgroundColor: '#171717', borderRadius: 28, paddingVertical: 18,
    width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    marginBottom: 20,
  },
  captureBtnDisabled: { opacity: 0.6, shadowOpacity: 0 },
  captureBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#888', fontSize: 14, fontWeight: '500' },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 12 },
  permSub: { color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permBtn: { backgroundColor: '#171717', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  permBtnText: { color: '#fff', fontWeight: '700' },
  processingPanel: {
    flex: 1,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  photoFrameContainer: {
    position: 'relative',
    width: 140, height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  glowRing: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    top: '-5%',
    left: '-5%',
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: '#4f46e5',
  },
  processingPhoto: {
    width: '95%',
    height: '95%',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  processingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    height: 40,
    paddingHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 36,
  },
  progressBarBg: {
    width: '85%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 3,
  },
});
