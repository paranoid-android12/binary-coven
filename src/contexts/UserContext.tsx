import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { clearAllGameState, logLocalStorageState, validateAndRepairLocalStorage } from '@/utils/localStorageManager';

export interface StudentUser {
  id: string;
  username: string;
  displayName: string;
  sessionCodeId: string;
}

export interface AdminUser {
  id: string;
  role: 'admin';
}

export type User = StudentUser | AdminUser | null;

interface UserContextType {
  user: User;
  userType: 'student' | 'admin' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: StudentUser | AdminUser, type: 'student' | 'admin') => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [userType, setUserType] = useState<'student' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
        setUserType(data.userType);
      } else {
        setUser(null);
        setUserType(null);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setUserType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: StudentUser | AdminUser, type: 'student' | 'admin') => {
    setUser(userData);
    setUserType(type);
  };

  const logout = async () => {
    try {
      console.log('[UserContext] Logging out...');

      // Log current state before clearing
      logLocalStorageState();

      // Clear all game-related localStorage data
      clearAllGameState();

      console.log('[UserContext] LocalStorage cleared');

      // Call logout API to clear session cookies
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setUserType(null);

      // Redirect to appropriate page
      if (userType === 'admin') {
        router.push('/admin/login');
      } else {
        // Redirect to main menu (which will show login modal when Start is clicked)
        router.push('/');
      }

      console.log('[UserContext] Logout complete');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check session on mount
  useEffect(() => {
    // Validate and repair localStorage on app startup
    validateAndRepairLocalStorage();

    // Then check session
    checkSession();
  }, []);

  const isAuthenticated = user !== null;

  return (
    <UserContext.Provider
      value={{
        user,
        userType,
        isLoading,
        isAuthenticated,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Type guard helpers
export function isStudentUser(user: User): user is StudentUser {
  return user !== null && 'username' in user;
}

export function isAdminUser(user: User): user is AdminUser {
  return user !== null && 'role' in user && user.role === 'admin';
}
