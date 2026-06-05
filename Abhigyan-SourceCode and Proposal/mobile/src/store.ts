import { create } from 'zustand';
import { getPendingLogs } from './lib/db';
import NetInfo from '@react-native-community/netinfo';

interface AppState {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  isSupervisorAuthed: boolean;
  activeUserId: string | null;
  setOnlineStatus: (status: boolean) => void;
  refreshPendingLogs: () => Promise<void>;
  setIsSyncing: (status: boolean) => void;
  setSupervisorAuthed: (status: boolean) => void;
  setActiveUser: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true, // Will be updated by NetInfo listener
  pendingSyncCount: 0,
  isSyncing: false,
  isSupervisorAuthed: false,
  activeUserId: null,
  setOnlineStatus: (status) => set({ isOnline: status }),
  refreshPendingLogs: async () => {
    const logs = await getPendingLogs();
    set({ pendingSyncCount: logs.length });
  },
  setIsSyncing: (status) => set({ isSyncing: status }),
  setSupervisorAuthed: (status) => set({ isSupervisorAuthed: status }),
  setActiveUser: (id) => set({ activeUserId: id }),
}));

// Setup network listener for React Native
NetInfo.addEventListener(state => {
  useAppStore.getState().setOnlineStatus(!!state.isConnected);
});
