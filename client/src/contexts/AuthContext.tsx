import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { useToast } from './ToastContext';
import axios from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: { id: string; name: string };
  faculty?: { id: string; name: string };
  school?: { id: string; name: string };
  yearOfStudy?: number;
  reputation?: number;
  isVerified?: boolean;
  image?: string;
  lastProfileUpdate?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get('/users/profile');
      // API returns { success: true, message: '...', data: User }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedUser = (res.data as any).data || res.data;
      console.log('AuthContext refreshed user:', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          // Optimistic: Stop loading immediately if we have cached data
          setIsLoading(false);
        }

        // Verify token and refresh user data in background
        try {
          const res = await axios.get('/users/profile');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fetchedUser = (res.data as any).data || res.data;
          setUser(fetchedUser);
          localStorage.setItem('user', JSON.stringify(fetchedUser));
        } catch (error) {
          console.error('Token invalid or expired', error);
          // Only clear if we failed to verify
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          // Only show toast if user was previously logged in (had cached user data)
          // Don't show on fresh page load
          if (storedUser) {
            toast.error('Session expired. Please log in again.');
          }
        }
      }

      // Ensure loading is false eventually
      setIsLoading(false);
    };

    initAuth();

    // Track if toast was already shown during init
    let unauthorizedToastShown = false;
    const handleUnauthorized = () => {
      if (unauthorizedToastShown) return; // Prevent duplicate toasts
      unauthorizedToastShown = true;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      toast.error('Session expired. Please log in again.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [toast]);

  const login = useCallback(
    (newToken: string, newUser: User) => {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      toast.success(`Welcome back, ${newUser.firstName}!`);
    },
    [toast],
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.info('Logged out successfully');
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
