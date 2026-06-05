import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { extractFaceEmbedding, loadModels } from '../lib/vision';
import { saveUser } from '../lib/db';
import { TopBar } from '../components/TopBar';
import { Dock } from '../components/Dock';
import Animated, { 
  FadeIn, FadeOut, Easing, useSharedValue, 
  withRepeat, withTiming, useAnimatedStyle 
} from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const TARGET_RESOLUTION = { width: 480, height: 640 };

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Position face in the frame');
  const [isSuccess, setIsSuccess] = useState(false);
  
  // New States for Premium Processing UX
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [empId, setEmpId] = useState('');
  const [progressText, setProgressText] = useState('');

  const progressVal = useSharedValue(0);
  const breathingVal = useSharedValue(1);
  const photoOutput = usePhotoOutput({ targetResolution: TARGET_RESOLUTION });
  const outputs = useMemo(() => [photoOutput], [photoOutput]);
  
  const isFocused = useIsFocused();
  const isMounted = useRef(true);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    loadModels().catch(err => console.error('Model load failed', err));
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Breathing glowing ring animation
  useEffect(() => {
    breathingVal.value = withRepeat(
      withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const toggleCamera = useCallback(() => {
    // Front camera only now
  }, []);

  const handleRegister = useCallback(async () => {
    if (isProcessingRef.current) return;
    
    if (!name.trim()) {
      setStatus('Please enter a name first.');
      return;
    }
    
    if (!hasPermission) {
      requestPermission();
      return;
    }

    if (!device) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setStatus('Capturing Snapshot...');
    setProgressText('📸 Capturing face snapshot...');

    try {
      let imagePath;
      if (Platform.OS === 'web') {
        throw new Error("Taking photos is not currently supported on Web using VisionCamera. Please test on an Android/iOS device or emulator.");
      } else {
        const photo = await photoOutput.capturePhotoToFile({}, {});
        imagePath = photo.filePath.startsWith('file://') ? photo.filePath : 'file://' + photo.filePath;
      }
      
      // setCapturedPhoto can just use the local file uri
      setCapturedPhoto(imagePath);

      setProgressText('🧬 Compiling 128-dimensional biometric signature...');

      // --- CRITICAL YIELD ---
      await new Promise(resolve => setTimeout(resolve, 200));
      if (!isMounted.current) return;
      // ----------------------

      progressVal.value = 0;
      progressVal.value = withTiming(0.95, { duration: 5000, easing: Easing.out(Easing.cubic) });

      const embedding = await extractFaceEmbedding(imagePath);
      if (!isMounted.current) return;
      
      progressVal.value = withTiming(1, { duration: 400 });
      setProgressText('✨ Finalizing employee registration profile...');
      await new Promise(r => setTimeout(r, 500));
      if (!isMounted.current) return;

      const generatedId = `EMP-${Math.floor(Math.random() * 90000) + 10000}`;
      setEmpId(generatedId);

      await saveUser({
        id: generatedId,
        name: name.trim(),
        role: 'field_personnel',
        embeddingId: `emb-${generatedId}`,
        createdAt: Date.now(),
      }, embedding);

      progressVal.value = withTiming(1, { duration: 300 });
      setProgressText('✓ Biometric Enrolled Successfully!');
      await new Promise(r => setTimeout(r, 450));

      setIsProcessing(false);
      isProcessingRef.current = false;
      setIsSuccess(true);
    } catch (err: any) {
      if (!isMounted.current) return;
      console.error(err);
      setStatus(err.message || 'Enrollment failed. Please try again.');
      setIsProcessing(false);
      isProcessingRef.current = false;
      setCapturedPhoto(null);
    }
  }, [name, hasPermission, device, photoOutput, requestPermission]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressVal.value * 100}%`
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingVal.value }],
    opacity: 0.6 - (progressVal.value * 0.4)
  }));

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Register Personnel" />
      
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          
          {/* Camera — always mounted, never unmounts during capture */}
          <View style={capturedPhoto ? styles.cameraContainerHidden : styles.cameraContainer}>
            {hasPermission && device ? (
              <Camera
                style={styles.camera}
                device={device}
                isActive={isFocused && !capturedPhoto}
                outputs={outputs}
              />
            ) : (
              <View style={[styles.cameraPlaceholder, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#666', marginBottom: 12 }}>Camera access is required</Text>
                <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#171717', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {!capturedPhoto && (
              <View style={styles.cameraOverlay}>
                <TouchableOpacity style={styles.toggleBtn} onPress={toggleCamera}>
                  <Text style={styles.toggleBtnText}>Flip</Text>
                </TouchableOpacity>

                <View style={styles.dashedCircle} />

                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Processing panel — overlays on top when photo captured */}
          {capturedPhoto && (
            <Animated.View entering={FadeIn} style={styles.processingPanel}>
              <View style={styles.photoFrameContainer}>
                <Animated.View style={[styles.glowRing, glowStyle]} />
                <Image source={{ uri: capturedPhoto }} style={styles.processingPhoto} />
              </View>

              <Text style={styles.processingTitle}>Enrolling Biometrics</Text>
              <Text style={styles.processingSubtitle}>{progressText}</Text>

              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <Animated.View style={[styles.progressBarFill, progressStyle]} />
                </View>
                <Text style={styles.progressPercentage}>
                  {Math.round(progressVal.value * 100)}%
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Form Section — only when camera is showing */}
          {!capturedPhoto && (
            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  editable={!isProcessing}
                />
                <Text style={styles.inputHint}>
                  Ensure the personnel's face is clearly visible without sunglasses or hats.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.enrollBtn, (isProcessing || !name.trim()) && styles.enrollBtnDisabled]}
                onPress={handleRegister}
                disabled={isProcessing || !name.trim()}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.enrollBtnText}>Enroll Personnel</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
        </View>
      </KeyboardAvoidingView>

      {isSuccess && (
        <Animated.View entering={FadeIn} style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.delay(200)} style={styles.modalCard}>
            
            <View style={styles.modalCheckCircle}>
              <Text style={styles.modalCheckMark}>✓</Text>
            </View>

            <Text style={styles.modalTitle}>Registration Complete</Text>
            <Text style={styles.modalSubtitle}>Biometric signature compiled offline successfully.</Text>

            <View style={styles.profileBadge}>
              <View style={styles.profileRow}>
                <Text style={styles.badgeLabel}>NAME</Text>
                <Text style={styles.badgeVal}>{name}</Text>
              </View>
              <View style={[styles.profileRow, { borderTopWidth: 1, borderTopColor: '#e5e5e5', marginTop: 8, paddingTop: 8 }]}>
                <Text style={styles.badgeLabel}>EMPLOYEE ID</Text>
                <Text style={styles.badgeIdText}>{empId}</Text>
              </View>
            </View>

            <View style={styles.actionButtonContainer}>
              <TouchableOpacity 
                style={styles.dashboardBtn}
                onPress={() => navigation.navigate('Dashboard')}
              >
                <Text style={styles.dashboardBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </Animated.View>
      )}

      <Dock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingBottom: 80 },
  
  cameraContainer: {
    flex: 0.85,
    width: '100%',
    backgroundColor: '#f5f5f5',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraContainerHidden: {
    height: 0,
    overflow: 'hidden',
  },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, backgroundColor: '#e5e5e5' },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  toggleBtn: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dashedCircle: {
    width: 220, height: 220,
    borderRadius: 1000,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
  statusPill: {
    position: 'absolute', bottom: 16,
    left: 20, right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'space-between',
  },
  inputWrapper: {
    marginTop: 20,
  },
  input: {
    borderBottomWidth: 1, borderBottomColor: '#e5e5e5',
    paddingVertical: 12, fontSize: 18, color: '#000', fontWeight: '500',
  },
  inputHint: {
    color: '#999', fontSize: 12, marginTop: 12, lineHeight: 18,
  },
  enrollBtn: {
    backgroundColor: '#737373',
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  enrollBtnDisabled: { opacity: 0.5 },
  enrollBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

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
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    marginTop: 10,
  },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '6%',
  },
  modalCard: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: '8%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalCheckCircle: {
    width: '20%',
    aspectRatio: 1,
    borderRadius: 1000,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6%',
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  modalCheckMark: {
    fontSize: 32,
    color: '#059669',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  profileBadge: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 28,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badgeVal: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  badgeIdText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButtonContainer: {
    width: '100%',
    gap: 12,
  },
  dashboardBtn: {
    width: '100%',
    backgroundColor: '#171717',
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
