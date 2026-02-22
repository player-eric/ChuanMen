import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@/types/auth';

const storageKey = 'chuanmen.auth.user';

interface AuthContextValue {
  user: AuthUser | null;
  isRegistered: boolean;
  setUser: (user: AuthUser | null, options?: { remember?: boolean }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => readStoredUser());

  const setUser = (nextUser: AuthUser | null, options?: { remember?: boolean }) => {
    setUserState(nextUser);

    if (nextUser) {
      const remember = options?.remember ?? true;
      if (remember) {
        localStorage.setItem(storageKey, JSON.stringify(nextUser));
        sessionStorage.removeItem(storageKey);
      } else {
        sessionStorage.setItem(storageKey, JSON.stringify(nextUser));
        localStorage.removeItem(storageKey);
      }
      return;
    }

    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isRegistered: Boolean(user),
      setUser,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('认证相关钩子必须在认证上下文提供器内使用');
  }

  return context;
}
