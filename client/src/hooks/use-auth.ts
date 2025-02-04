import { create } from 'zustand';
import { useEffect } from 'react';
import { useToast } from './use-toast';

interface User {
  id: number;
  username: string;
  tradingPreferences?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  login: async (username: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al iniciar sesión');
      }
      
      const user = await response.json();
      set({ user, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  register: async (username: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al registrar usuario');
      }
      
      const user = await response.json();
      set({ user, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  logout: async () => {
    try {
      set({ loading: true });
      await fetch('/api/logout', { method: 'POST' });
      set({ user: null, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  checkAuth: async () => {
    try {
      set({ loading: true });
      const response = await fetch('/api/user');
      if (response.ok) {
        const user = await response.json();
        set({ user, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      set({ user: null, loading: false });
    }
  },
}));

export function useAuth() {
  const authStore = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    authStore.checkAuth();
  }, []);

  const handleError = (error: Error) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  };

  return {
    user: authStore.user,
    loading: authStore.loading,
    error: authStore.error,
    login: async (username: string, password: string) => {
      try {
        await authStore.login(username, password);
        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente",
        });
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    register: async (username: string, password: string) => {
      try {
        await authStore.register(username, password);
        toast({
          title: "¡Registro exitoso!",
          description: "Tu cuenta ha sido creada correctamente",
        });
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await authStore.logout();
        toast({
          title: "Sesión cerrada",
          description: "Has cerrado sesión correctamente",
        });
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    isAuthenticated: !!authStore.user,
  };
}
