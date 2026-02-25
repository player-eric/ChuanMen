import { useNavigate } from 'react-router';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5} alignItems="center" sx={{ py: 3, textAlign: 'center' }}>
          {icon && (
            <Typography variant="h3" sx={{ lineHeight: 1 }}>{icon}</Typography>
          )}
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
              {description}
            </Typography>
          )}
          {action && (
            <Box sx={{ mt: 0.5 }}>
              <Button
                variant="contained"
                size="small"
                onClick={action.onClick ?? (action.to ? () => navigate(action.to!) : undefined)}
              >
                {action.label}
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
