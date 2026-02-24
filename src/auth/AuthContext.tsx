import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@/types/auth';
import { getUserByEmail } from '@/lib/domainApi';

const storageKey = 'chuanmen.auth.user';

/**
 * Hard-coded walkthrough account for UI designers.
 * Auto-logged-in when no stored user is found.
 */
export const WALKTHROUGH_USER: AuthUser = {
  id: 'walkthrough-yuan-001',
  name: 'Yuan',
  email: 'yuan@chuanmen.app',
  avatar: undefined,
  bio: '串门儿的运营之一，平时喜欢看电影、做饭、在家招呼朋友。住在 Edison 快两年了，最近迷上了安哲罗普洛斯。',
  role: 'admin',
  location: 'Edison, NJ',
  selfAsFriend: '话不多，但是在的时候你会觉得很安心。带吃的是基本操作。',
  idealFriend: '不用很外向，但要真诚。能一起安静看完一部电影的那种。',
  participationPlan: '继续做运营和 Host，希望串门儿能慢慢长大但不变质。',
  coverImageUrl: undefined,
  defaultHouseRules: '请换鞋入内 · 有猫（注意过敏）· 10pm 前结束',
  homeAddress: '789 Elm St, Edison, NJ 08820',
  hideEmail: false,
  googleId: 'google-yuan-mock-id',
};

interface AuthContextValue {
  user: AuthUser | null;
  isRegistered: boolean;
  setUser: (user: AuthUser | null, options?: { remember?: boolean }) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => readStoredUser());

  // Resolve walkthrough / stored user against real DB to get correct id
  useEffect(() => {
    const current = user;
    if (!current?.email) return;
    // If the id looks like a real cuid, skip resolution
    if (current.id && !current.id.startsWith('walkthrough-') && current.id.length > 20) return;
    let cancelled = false;
    getUserByEmail(current.email)
      .then((dbUser) => {
        if (cancelled) return;
        const resolved: AuthUser = {
          ...current,
          id: dbUser.id,
          name: dbUser.name ?? current.name,
          avatar: dbUser.avatar || current.avatar,
          role: (dbUser.role as string) || current.role,
        };
        setUserState(resolved);
        localStorage.setItem(storageKey, JSON.stringify(resolved));
      })
      .catch(() => { /* API not available — keep local user */ });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
