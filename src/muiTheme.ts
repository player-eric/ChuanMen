import { createTheme } from '@mui/material/styles';

export type AppColorMode = 'light' | 'dark';

export function createAppTheme(mode: AppColorMode = 'dark') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? '#d4a574' : '#6A5035' },
      secondary: { main: '#6f9d8f' },
      background: isDark
        ? {
            default: '#121214',
            paper: '#1E1E22',
          }
        : {
            default: '#F9F8F6',
            paper: '#FFFFFF',
          },
      text: isDark
        ? {
            primary: '#f5f2ec',
            secondary: '#a6a2a0',
          }
        : {
            primary: '#1C1B18',
            secondary: '#4A4640',
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
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
            backgroundImage: 'none',
            ...(isDark ? {} : { backgroundColor: '#FFFFFF' }),
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorTransparent: {
            backgroundColor: isDark ? '#17171ccc' : '#F9F8F6cc',
          },
        },
      },
      ...(isDark ? {} : {
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 600,
            },
            outlined: {
              borderColor: 'rgba(0,0,0,0.15)',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            outlined: {
              borderColor: 'rgba(0,0,0,0.15)',
              '&.MuiButton-colorInherit': {
                borderColor: 'rgba(0,0,0,0.12)',
                color: '#4A4640',
              },
            },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: {
              color: '#7A756E',
              '&.Mui-selected': {
                color: '#6A5035',
              },
            },
          },
        },
      }),
    },
  });
}

const theme = createAppTheme('dark');

export default theme;
