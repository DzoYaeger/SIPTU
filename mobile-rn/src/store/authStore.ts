import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthState, User, LoginCredentials } from '../types';
import { authService } from '../services/authService';

interface AuthStore extends AuthState {
  justLoggedIn: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  loadAuthState: () => Promise<void>;
  clearJustLoggedIn: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  justLoggedIn: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const response = await authService.login(credentials);
      console.log('Login response:', response.data);
      
      const { user, token, access_token } = response.data;
      
      // Handle different response formats
      const authToken = token || access_token;
      const userData = user || response.data;
      
      if (!authToken) {
        throw new Error('Token tidak ditemukan dalam response');
      }
      
      await AsyncStorage.setItem('token', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      set({ user: userData, token: authToken, isAuthenticated: true, isLoading: false, justLoggedIn: true });
    } catch (error) {
      console.warn('Login store error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    await AsyncStorage.multiRemove(['token', 'user']);
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),

  clearJustLoggedIn: () => set({ justLoggedIn: false }),

  loadAuthState: async () => {
    try {
      const [token, userStr] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    }
  },
}));
