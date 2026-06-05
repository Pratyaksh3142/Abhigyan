import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthLog } from '../types';
import { pushLogsToAWS } from './aws';

const USERS_KEY = '@faceguard_users';
const LOGS_KEY = '@faceguard_logs';

export async function getAllUsers(): Promise<User[]> {
  const json = await AsyncStorage.getItem(USERS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function getUser(id: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.id === id);
}

// In RN, we can store the Float32Array as a normal array in JSON
export async function saveUser(user: User, vector: Float32Array) {
  const users = await getAllUsers();
  users.push({ ...user, vector: Array.from(vector) as any });
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function saveAuthLog(log: Omit<AuthLog, 'synced'>) {
  const json = await AsyncStorage.getItem(LOGS_KEY);
  const logs = json ? JSON.parse(json) : [];
  logs.push({ ...log, synced: 0 });
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function getPendingLogs(): Promise<AuthLog[]> {
  const json = await AsyncStorage.getItem(LOGS_KEY);
  const logs = json ? JSON.parse(json) : [];
  return logs.map((l: any) => ({ ...l, synced: false })) as AuthLog[];
}

export async function purgeLogs(logIds: string[]) {
  const json = await AsyncStorage.getItem(LOGS_KEY);
  let logs: any[] = json ? JSON.parse(json) : [];
  logs = logs.filter(l => !logIds.includes(l.id));
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function performMasterSync() {
  const pendingLogs = await getPendingLogs();
  if (pendingLogs.length === 0) return 0;

  const success = await pushLogsToAWS(pendingLogs);
  if (success) {
    const logIds = pendingLogs.map(l => l.id);
    await purgeLogs(logIds);
    return logIds.length;
  } else {
    throw new Error("Failed to sync to AWS backend");
  }
}

// Seeding standard Demo User
export async function seedDemoData() {
  const users = await getAllUsers();
  if (users.length === 0) {
    const mockVector = new Float32Array(128).fill(0.1);
    await saveUser(
      {
        id: 'DEMO-001',
        name: 'Field Officer A',
        role: 'field_personnel',
        embeddingId: 'emb-001',
        createdAt: Date.now(),
      },
      mockVector
    );
  }
}
