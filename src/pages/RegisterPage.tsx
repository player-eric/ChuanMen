import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { registerUser } from '@/lib/authApi';
import { useAuth } from '@/auth/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.title = '串门儿 - 注册';
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setErrorMessage('请填写姓名和邮箱');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const user = await registerUser({
        name: name.trim(),
        email: email.trim(),
        avatar: avatar.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      setUser(user);
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '注册失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 520 }}>
        <CardContent>
          <Stack
            spacing={2}
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
            autoComplete="on"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <img src="/logo.png" alt="" style={{ height: 32, width: 'auto' }} />
                <Typography variant="h5" fontWeight={700}>欢迎加入串门儿</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                先完成注册，再进入全站功能。
              </Typography>
            </Box>

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <TextField
              label="姓名"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              fullWidth
            />
            <TextField
              label="邮箱"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              fullWidth
            />
            <TextField
              label="头像 URL（可选）"
              name="photo"
              value={avatar}
              onChange={(event) => setAvatar(event.target.value)}
              autoComplete="photo"
              fullWidth
            />
            <TextField
              label="个人简介（可选）"
              name="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              multiline
              minRows={3}
              autoComplete="off"
              fullWidth
            />

            <Box>
              <Button variant="outlined" disabled fullWidth>
                上传封面图（即将开放）
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                封面图将展示在你的个人页面顶部
              </Typography>
            </Box>

            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? '注册中...' : '注册并进入'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              已有账号？
              <Link component={RouterLink} to="/login" sx={{ ml: 0.5 }}>
                去登录
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
