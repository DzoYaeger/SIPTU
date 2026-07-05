import api from './api';
import { LoginCredentials } from '../types';

export const authService = {
  login: (credentials: LoginCredentials) => {
    return api.post('/login', credentials);
  },

  logout: () => {
    return api.post('/logout');
  },

  getProfile: () => {
    return api.get('/user');
  },

  updateProfile: (data: any) => {
    return api.put('/user/profile', data);
  },

  changePassword: (data: { old_password: string; new_password: string }) => {
    return api.post('/user/password', data);
  },
};
