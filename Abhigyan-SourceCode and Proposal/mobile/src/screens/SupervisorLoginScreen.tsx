import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAppStore } from '../store';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Fingerprint } from 'lucide-react-native';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SupervisorLogin'>;

const SUPERVISOR_PIN = '1234';

export function SupervisorLoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setSupervisorAuthed } = useAppStore();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      if (password === SUPERVISOR_PIN) {
        setIsLoading(false);
        setSupervisorAuthed(true);
        navigation.replace('Dashboard');
      } else {
        setError('Invalid PIN.');
        setIsLoading(false);
        setPassword('');
      }
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.header}>
            <View style={styles.iconBox}>
              <Fingerprint color="#fff" size={32} strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Sign in to manage the system</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100).springify()} style={styles.form}>
            <View style={[styles.inputWrapper, { marginTop: 24 }]}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
              />
            </View>
            <Text style={styles.hintText}>Hint: 1234</Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity 
              style={[styles.loginBtn, (isLoading || !password) && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Continue</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.footer}>
            <Text style={styles.footerText}>AUTHORIZED PERSONNEL ONLY</Text>
          </Animated.View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, paddingHorizontal: 32, paddingTop: '15%', paddingBottom: 32 },
  
  header: { alignItems: 'center', marginBottom: 64 },
  iconBox: {
    width: 64, height: 64, backgroundColor: '#000',
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
  },
  title: { fontSize: 26, fontWeight: '600', color: '#000', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#666', fontWeight: '500', letterSpacing: 0.5 },

  form: { flex: 1, maxWidth: 400, width: '100%', alignSelf: 'center' },
  inputWrapper: { position: 'relative' },
  input: {
    borderBottomWidth: 1, borderBottomColor: '#e5e5e5',
    paddingVertical: 12, fontSize: 18, color: '#000', fontWeight: '500',
  },
  errorText: { color: '#e74c3c', fontSize: 12, marginTop: 8 },
  
  loginBtn: {
    backgroundColor: '#000', borderRadius: 24, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 40,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  loginBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },

  footer: { marginTop: 32, paddingTop: 24, alignItems: 'center' },
  footerText: { fontSize: 9, color: '#aaa', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  hintText: { fontSize: 12, color: '#666', marginTop: 8, fontStyle: 'italic' },
});
