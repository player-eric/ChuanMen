import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from '@/muiTheme';
import { AuthProvider } from '@/auth/AuthContext';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
