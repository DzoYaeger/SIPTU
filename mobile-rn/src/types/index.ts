export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  nip?: string;
  unit?: string;
  jabatan?: string;
  function_area?: string;
  phone_number?: string;
  avatar?: string;
  base_role?: string;
  available_roles?: string[];
  employee?: {
    id: number;
    nip: string;
    name: string;
    position: string;
    department: string;
    function_area: string;
    pangkat?: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  nip: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  description?: string;
  color?: string;
}
