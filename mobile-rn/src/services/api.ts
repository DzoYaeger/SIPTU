import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Production URL - pointing to hosted backend
const API_BASE_URL = 'https://siptu.bpompalopo.com/core_api/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Disable cookies for CORS
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
      console.log('🚀 [API Request]', config.method?.toUpperCase(), fullUrl);
      
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('❌ [Token Error] AsyncStorage failed:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
    }
    
    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('Server Error:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;
