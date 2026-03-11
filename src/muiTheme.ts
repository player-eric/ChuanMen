import { createTheme } from '@mui/material/styles';

export type AppColorMode = 'light' | 'dark';

export function createAppTheme(mode: AppColorMode = 'dark') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: '#d4a574' },
      secondary: { main: '#6f9d8f' },
      background: isDark
        ? {
            default: '#121214',
            paper: '#1E1E22',
          }
        : {
            default: '#FAFAFA',
            paper: '#FFFFFF',
          },
      text: isDark
        ? {
            primary: '#f5f2ec',
            secondary: '#a6a2a0',
          }
        : {
            primary: '#2f2822',
            secondary: '#6f655d',
          },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      h5: { fontWeight: 800 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(34,26,20,0.12)',
            backgroundImage: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorTransparent: {
            backgroundColor: isDark ? '#17171ccc' : '#FAFAFAcc',
          },
        },
      },
    },
  });
}

const theme = createAppTheme('dark');

export default theme;
