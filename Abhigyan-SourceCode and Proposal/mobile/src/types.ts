export interface User {
  id: string;
  name: string;
  role: 'field_personnel' | 'admin';
  embeddingId: string;
  createdAt: number;
  vector?: number[]; // Stored as regular array in AsyncStorage
}

export interface AuthLog {
  id: string;
  userId: string;
  timestamp: number;
  status: 'success' | 'failed' | 'liveness_failed';
  confidenceScore: number;
  synced: boolean;
  location?: { lat: number; lng: number };
}

export interface SyncStatus {
  lastSyncTime: number | null;
  pendingLogs: number;
  isOnline: boolean;
}

export type RootStackParamList = {
  Splash: undefined;
  SupervisorLogin: undefined;
  Dashboard: undefined;
  FaceScan: undefined;
  Liveness: { embedding: number[]; capturedAt: number };
  Register: undefined;
  Settings: undefined;
};
