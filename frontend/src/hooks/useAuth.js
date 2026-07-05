import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * Hook untuk mengakses context autentikasi
 * @returns {{ token: string|null, user: object|null, currentRole: string|null, allowedRoles: array, authLoading: boolean, login: function, logout: function, refreshProfile: function, switchRole: function, headers: object, apiFetch: function, accessibleModules: array, modulesTree: array, hasRole: function, requestPasswordReset: function, resetPassword: function }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
