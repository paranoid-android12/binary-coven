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
  username: string;
  email: string | null;
  role: 'super_admin' | 'admin';
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
    // Capture userType before clearing (needed for redirect)
    const currentUserType = userType;
    
    try {
      console.log('[UserContext] Logging out...');

      // Log current state before clearing
      logLocalStorageState();

      // Clear all game-related localStorage data
      clearAllGameState();

      console.log('[UserContext] LocalStorage cleared');

      // Call logout API to clear session cookies
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Clear any additional cookies manually (in case API doesn't catch all)
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        // Clear common session cookies
        if (name.includes('session') || name.includes('auth') || name.includes('token')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        }
      });

      setUser(null);
      setUserType(null);

      // Force a full page refresh by navigating to the appropriate page
      // This ensures all state is cleared and the page is completely reloaded
      const redirectPath = currentUserType === 'admin' ? '/admin/login' : '/';
      window.location.href = redirectPath;

      console.log('[UserContext] Logout complete - forcing page refresh');
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, force refresh to ensure clean state
      const redirectPath = currentUserType === 'admin' ? '/admin/login' : '/';
      window.location.href = redirectPath;
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
  return user !== null && 'sessionCodeId' in user;
}

export function isAdminUser(user: User): user is AdminUser {
  return user !== null && 'role' in user && (user.role === 'admin' || user.role === 'super_admin');
}
