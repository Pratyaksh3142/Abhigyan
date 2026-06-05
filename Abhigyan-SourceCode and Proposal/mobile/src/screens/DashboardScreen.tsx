import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAppStore } from '../store';
import { getAllUsers } from '../lib/db';
import { Dock } from '../components/Dock';
import { 
  ShieldCheck, 
  ScanFace, 
  Users, 
  Server, 
  Cpu, 
  Camera, 
  User, 
  Fingerprint,
  Activity
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { isOnline, pendingSyncCount, refreshPendingLogs } = useAppStore();
  const [userCount, setUserCount] = useState<number>(0);

  useEffect(() => {
    refreshPendingLogs();
    getAllUsers().then(users => setUserCount(users.length));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* HEADER */}
        <View style={styles.header}>
          <Animated.View entering={FadeInUp.delay(0)}>
            <View style={styles.headerTitleRow}>
              <ShieldCheck size={20} color="#171717" />
              <Text style={styles.headerTitle}>Operations</Text>
            </View>
            <Text style={styles.headerSubtitle}>SECURE OFFLINE AUTH</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(50)} style={styles.headerRight}>
            <View style={styles.networkPill}>
              <View style={[styles.dot, { backgroundColor: isOnline ? '#34d399' : '#a3a3a3' }]} />
              <Text style={styles.networkText}>{isOnline ? 'NETWORK' : 'OFFLINE'}</Text>
            </View>
            <View style={styles.avatar}>
              <User size={20} color="#a3a3a3" strokeWidth={2} />
            </View>
          </Animated.View>
        </View>

        <View style={styles.contentGrid}>
          {/* MAIN ACTION */}
          <AnimatedTouchableOpacity
            entering={FadeInUp.delay(100)}
            style={styles.primaryCard}
            onPress={() => {
              if (typeof document !== 'undefined' && document.activeElement) {
                (document.activeElement as HTMLElement).blur();
              }
              navigation.navigate('FaceScan');
            }}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.primaryLabelRow}>
                <Fingerprint size={20} color="#a3a3a3" strokeWidth={1.5} />
                <Text style={styles.primaryLabel}>PRIMARY ACTION</Text>
              </View>
              <Text style={styles.primaryTitle}>Employee Verification</Text>
              <Text style={styles.primarySub}>Offline Face & Liveness Detection</Text>
            </View>
            <View style={styles.primaryIconBox}>
              <ScanFace size={28} color="#fff" strokeWidth={1.5} />
            </View>
          </AnimatedTouchableOpacity>

          {/* STATS GRID */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.statsRow}>
            {/* Local Users Card */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={styles.iconCircle}>
                  <Users size={16} color="#525252" strokeWidth={2} />
                </View>
                <View style={styles.liveBadge}>
                  <Activity size={12} color="#525252" />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statNumber}>{userCount}</Text>
                <Text style={styles.statLabel}>LOCAL USERS</Text>
              </View>
            </View>

            {/* Offline Queue Card */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={styles.iconCircle}>
                  <Server size={16} color="#525252" strokeWidth={2} />
                </View>
                {pendingSyncCount > 0 && <View style={styles.pulseDot} />}
              </View>
              <View style={styles.statBody}>
                <Text style={styles.statNumber}>{pendingSyncCount}</Text>
                <Text style={styles.statLabel}>OFFLINE QUEUE</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: pendingSyncCount > 0 ? '60%' : '0%' }]} />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* SYSTEM STATUS PILLS */}
          <Animated.View entering={FadeInUp.delay(300)} style={styles.pillsRow}>
            <View style={styles.sysPill}>
              <Cpu size={14} color="#525252" />
              <Text style={styles.sysPillText}>CONFIG: READY</Text>
            </View>
            <View style={styles.sysPill}>
              <Camera size={14} color="#525252" />
              <Text style={styles.sysPillText}>CAM: ACTIVE</Text>
            </View>
            <View style={styles.sysPill}>
              <ShieldCheck size={14} color="#525252" />
              <Text style={styles.sysPillText}>SYS: SECURED</Text>
            </View>
          </Animated.View>

        </View>
      </ScrollView>
      
      <Dock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#171717', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 10, fontWeight: '600', color: '#737373', letterSpacing: 2, marginLeft: 28 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  networkPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#e5e5e5',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  networkText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#525252' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center',
  },
  contentGrid: { paddingHorizontal: 24, paddingBottom: 24, gap: 24 },
  primaryCard: {
    backgroundColor: '#171717', borderRadius: 24, padding: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  primaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  primaryLabel: { fontSize: 10, fontWeight: '700', color: '#a3a3a3', letterSpacing: 2 },
  primaryTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  primarySub: { fontSize: 11, fontWeight: '500', color: '#a3a3a3', letterSpacing: 0.5 },
  primaryIconBox: {
    width: 56, height: 56, borderRadius: 20, backgroundColor: '#262626',
    borderWidth: 1, borderColor: '#404040', alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: {
    flex: 1, backgroundColor: '#fafafa', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, borderWidth: 1, borderColor: '#e5e5e5',
  },
  liveText: { fontSize: 9, fontWeight: '700', color: '#525252', letterSpacing: 1 },
  statBody: { marginTop: 4 },
  statNumber: { fontSize: 30, fontWeight: '700', color: '#171717', letterSpacing: -1 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#737373', letterSpacing: 1.5, marginTop: 2 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#737373', marginTop: 4, marginRight: 4 },
  progressBar: { height: 4, backgroundColor: '#e5e5e5', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#525252', borderRadius: 2 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  sysPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fafafa', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5',
  },
  sysPillText: { fontSize: 9, fontWeight: '700', color: '#525252', letterSpacing: 1 },
});
