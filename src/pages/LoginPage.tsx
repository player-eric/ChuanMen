import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { loginUser } from '@/lib/authApi';
import { useAuth } from '@/auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.title = '串门儿 - 登录';
  }, []);

  const onSubmit = async () => {
    if (!email.trim()) {
      setErrorMessage('请填写邮箱');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const user = await loginUser(email.trim());
      setUser(user, { remember });
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 520 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={700}>登录串门儿</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                输入注册邮箱即可登录。
              </Typography>
            </Box>

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <TextField
              label="邮箱"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              fullWidth
            />

            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />}
              label="保持登录"
            />

            <Button variant="contained" onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? '登录中...' : '登录'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              还没有账号？
              <Link component={RouterLink} to="/register" sx={{ ml: 0.5 }}>
                去注册
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
