import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ShieldAlert, CloudUpload, Wifi, WifiOff } from 'lucide-react-native';
import { useAppStore } from '../store';

interface TopBarProps {
  title: string;
  showBack?: boolean;
}

export function TopBar({ title, showBack = false }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isOnline, pendingSyncCount, refreshPendingLogs } = useAppStore();

  useEffect(() => {
    refreshPendingLogs();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.leftGroup}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <ShieldAlert color="#000" size={20} strokeWidth={2} style={styles.shield} />
        <Text style={styles.title}>{title || 'FaceGuard'}</Text>
      </View>

      <View style={styles.rightGroup}>
        {pendingSyncCount > 0 && (
          <View style={styles.badgePill}>
            <CloudUpload color="#000" size={14} strokeWidth={2} style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>{pendingSyncCount}</Text>
          </View>
        )}
        
        <View style={[styles.badgePill, !isOnline && styles.badgePillOffline]}>
          {isOnline ? (
            <Wifi color="#000" size={14} strokeWidth={2} />
          ) : (
            <WifiOff color="#666" size={14} strokeWidth={2} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shield: {
    marginRight: 8,
  },
  backBtn: {
    marginRight: 12,
  },
  backText: {
    fontSize: 22,
    color: '#000',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 0.5,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  badgePillOffline: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
});
