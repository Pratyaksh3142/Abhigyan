import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAppStore } from '../store';
import { performMasterSync } from '../lib/db';
import { TopBar } from '../components/TopBar';
import { Dock } from '../components/Dock';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CloudUpload, CloudOff, LogOut } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { isOnline, pendingSyncCount, refreshPendingLogs, setSupervisorAuthed } = useAppStore();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  async function handleSync() {
    if (!isOnline) {
      setSyncMessage('Cannot sync while offline.');
      return;
    }
    setSyncing(true);
    setSyncMessage('Connecting to endpoint...');
    await new Promise(r => setTimeout(r, 800));

    try {
      const count = await performMasterSync();
      setSyncMessage(`Sync complete. ${count} logs securely purged.`);
      await refreshPendingLogs();
    } catch (err) {
      setSyncMessage('Sync failed. Logs retained safely offline.');
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setSyncMessage('');
      }, 2000);
    }
  }

  const handleSignOut = () => {
    setSupervisorAuthed(false);
    navigation.replace('SupervisorLogin');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar title="Settings" />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Sync Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(0)} style={styles.mainCard}>
          <View style={styles.blurCornerBg} />
          
          <View style={styles.iconBox}>
            {isOnline ? (
              <CloudUpload color="#fff" size={32} strokeWidth={1.5} />
            ) : (
              <CloudOff color="rgba(255,255,255,0.5)" size={32} strokeWidth={1.5} />
            )}
          </View>
          
          <Text style={styles.cardTitle}>Cloud Sync</Text>
          
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingSyncCount} EVENTS PENDING</Text>
          </View>

          <TouchableOpacity
            style={[styles.syncBtn, (pendingSyncCount === 0 || !isOnline || syncing) && styles.syncBtnDisabled]}
            onPress={handleSync}
            disabled={pendingSyncCount === 0 || !isOnline || syncing}
          >
            {syncing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.syncBtnText}>Secure Upload</Text>}
          </TouchableOpacity>

          {!!syncMessage && (
            <Animated.View entering={FadeInUp} style={styles.messageBox}>
              <Text style={styles.messageText}>> {syncMessage}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Network Status */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.networkCard}>
          <View style={styles.networkCol}>
            <Text style={styles.networkTitle}>Network Status</Text>
            <Text style={styles.networkSub}>{isOnline ? 'SYSTEM ONLINE' : 'OFFLINE MODE ACTIVE'}</Text>
          </View>
          <View style={[styles.networkDot, isOnline ? styles.networkDotOnline : styles.networkDotOffline]} />
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.signOutContainer}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut color="#000" size={20} strokeWidth={1.5} style={{ marginRight: 8 }} />
            <Text style={styles.signOutText}>Supervisor Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>

      <Dock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 20, paddingBottom: 100 }, // space for Dock
  
  // Main Card
  mainCard: {
    backgroundColor: '#fff', borderRadius: 40, padding: 32,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden', position: 'relative',
  },
  blurCornerBg: {
    position: 'absolute', top: -20, right: -20,
    width: 140, height: 140,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderBottomLeftRadius: 100,
  },
  iconBox: {
    width: 80, height: 80, borderRadius: 28, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  cardTitle: { fontSize: 24, fontWeight: '500', color: '#000', marginBottom: 8, letterSpacing: -0.5 },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 24,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#000', letterSpacing: 1 },
  syncBtn: {
    backgroundColor: '#000', borderRadius: 28, paddingVertical: 18,
    width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  syncBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  syncBtnText: { color: '#fff', fontWeight: '500', fontSize: 16 },
  
  // Log message box
  messageBox: {
    backgroundColor: '#f5f5f5', borderRadius: 20, padding: 12, width: '100%', marginTop: 20,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  messageText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, color: '#555' },

  // Network Status
  networkCard: {
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 32, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 32, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  networkCol: { flexDirection: 'column' },
  networkTitle: { fontSize: 14, fontWeight: '500', color: '#000' },
  networkSub: { fontSize: 12, color: '#666', fontWeight: '300', letterSpacing: 1, marginTop: 2 },
  networkDot: { width: 12, height: 12, borderRadius: 6 },
  networkDotOnline: { backgroundColor: '#000' },
  networkDotOffline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' },

  // Sign out container
  signOutContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 32, padding: 8,
    marginTop: 'auto',
  },
  signOutBtn: {
    backgroundColor: '#fff', borderRadius: 26, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5,
  },
  signOutText: { color: '#000', fontWeight: '500', fontSize: 16 },
});
