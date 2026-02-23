import { useTheme } from '@mui/material/styles';
import { cDark, cLight } from '@/theme';
import type { DesignTokens } from '@/theme';

export function useColors(): DesignTokens {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? cDark : cLight;
}
