import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createAppTheme } from '@/muiTheme';
import type { AppColorMode } from '@/muiTheme';
import { AuthProvider } from '@/auth/AuthContext';
import { Analytics } from '@vercel/analytics/react';

type ColorModeContextValue = {
  mode: AppColorMode;
  toggleColorMode: () => void;
};

const STORAGE_KEY = 'chuanmen-color-mode';

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error('useColorMode must be used within AppProviders');
  }
  return context;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppColorMode>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      setMode(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      toggleColorMode: () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
