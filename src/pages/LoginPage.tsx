import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { googleLogin, sendLoginCode, verifyLoginCode } from '@/lib/domainApi';
import type { GoogleProfile } from '@/lib/domainApi';

type Step = 'email' | 'code' | 'status';
type StatusInfo = {
  type: 'pending_review' | 'rejected' | 'rejected_can_reapply' | 'banned' | 'not_registered';
  message: string;
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string; locale?: string },
          ) => void;
        };
      };
    };
  }
}

function setUserFromResponse(
  u: Record<string, unknown>,
  setUser: (user: any, opts?: { remember?: boolean }) => void,
  remember: boolean,
) {
  setUser(
    {
      id: u.id as string,
      name: u.name as string,
      email: u.email as string,
      avatar: u.avatar as string | undefined,
      bio: u.bio as string | undefined,
      role: u.role as string | undefined,
      location: u.location as string | undefined,
      selfAsFriend: u.selfAsFriend as string | undefined,
      idealFriend: u.idealFriend as string | undefined,
      participationPlan: u.participationPlan as string | undefined,
      coverImageUrl: u.coverImageUrl as string | undefined,
      defaultHouseRules: u.defaultHouseRules as string | undefined,
      homeAddress: u.homeAddress as string | undefined,
      hideEmail: u.hideEmail as boolean | undefined,
      googleId: u.googleId as string | undefined,
    },
    { remember },
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusInfo, setStatusInfo] = useState<StatusInfo | null>(null);
  const [countdown, setCountdown] = useState(0);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = '串门儿 - 登录';
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [navigate, user]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle status errors shared between email & Google flows
  const handleStatusError = useCallback((errorCode: string, message: string, googleProfile?: GoogleProfile) => {
    const statusTypes: StatusInfo['type'][] = [
      'pending_review', 'rejected', 'rejected_can_reapply', 'banned',
    ];
    if (errorCode === 'not_registered' && googleProfile) {
      // New user with Google — redirect to /apply with prefilled profile
      navigate('/apply', { state: { googleProfile } });
      return true;
    }
    if (errorCode === 'not_registered') {
      setStatusInfo({ type: 'not_registered', message });
      setStep('status');
      return true;
    }
    if (statusTypes.includes(errorCode as StatusInfo['type'])) {
      setStatusInfo({ type: errorCode as StatusInfo['type'], message });
      setStep('status');
      return true;
    }
    return false;
  }, [navigate]);

  // Google Sign-In callback
  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const result = await googleLogin(response.credential);
      setUserFromResponse(result.user, setUser, remember);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorCode = (err as any)?.errorCode;
      const gp = (err as any)?.googleProfile as GoogleProfile | undefined;
      if (!handleStatusError(errorCode, (err as Error).message, gp)) {
        setErrorMessage(err instanceof Error ? err.message : 'Google 登录失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [handleStatusError, navigate, remember, setUser]);

  // Load Google Identity Services script & render button
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 400,
        text: 'continue_with',
        locale: 'zh-CN',
      });
    };

    if (window.google) {
      initGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [handleGoogleResponse]);

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('请填写邮箱');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await sendLoginCode(trimmed);
      setStep('code');
      setCountdown(60);
    } catch (err: unknown) {
      const errorCode = (err as any)?.errorCode;
      if (!handleStatusError(errorCode, (err as Error).message)) {
        setErrorMessage(err instanceof Error ? err.message : '发送验证码失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setErrorMessage('请输入 6 位验证码');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await verifyLoginCode(email.trim(), code);
      setUserFromResponse(result.user, setUser, remember);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorCode = (err as any)?.errorCode;
      if (!handleStatusError(errorCode, (err as Error).message)) {
        setErrorMessage(err instanceof Error ? err.message : '验证失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await sendLoginCode(email.trim());
      setCountdown(60);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '重新发送失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Status screen (pending / rejected / banned / not registered) ──
  if (step === 'status' && statusInfo) {
    const statusContent: Record<StatusInfo['type'], { emoji: string; title: string; cta?: { label: string; to: string } }> = {
      pending_review: { emoji: '⏳', title: '申请审核中' },
      rejected: { emoji: '😔', title: '申请未通过' },
      rejected_can_reapply: { emoji: '🔄', title: '可以重新申请', cta: { label: '重新申请', to: '/apply' } },
      banned: { emoji: '🚫', title: '账号已停用' },
      not_registered: { emoji: '👋', title: '还没有账号', cta: { label: '申请加入', to: '/apply' } },
    };
    const info = statusContent[statusInfo.type];

    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
        <Card sx={{ width: '100%', maxWidth: 520 }}>
          <CardContent>
            <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h3">{info.emoji}</Typography>
              <Typography variant="h6" fontWeight={700}>{info.title}</Typography>
              <Typography variant="body2" color="text.secondary">{statusInfo.message}</Typography>
              {info.cta && (
                <Button variant="contained" onClick={() => navigate(info.cta!.to)}>
                  {info.cta.label}
                </Button>
              )}
              <Button
                size="small"
                onClick={() => { setStep('email'); setCode(''); setErrorMessage(''); setStatusInfo(null); }}
              >
                返回登录
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 520 }}>
        <CardContent>
          <Stack
            spacing={2}
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              if (step === 'email') void handleSendCode();
              else if (step === 'code') void handleVerifyCode();
            }}
            autoComplete="on"
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <img src="/logo.png" alt="" style={{ height: 32, width: 'auto' }} />
                <Typography variant="h5" fontWeight={700}>登录串门儿</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {step === 'email'
                  ? '输入你的邮箱，我们会发送验证码。'
                  : `验证码已发送到 ${email}`}
              </Typography>
            </Box>

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            {step === 'email' && (
              <>
                <TextField
                  label="邮箱"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  fullWidth
                  autoFocus
                />

                <FormControlLabel
                  control={<Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />}
                  label="保持登录"
                />

                <Button type="submit" variant="contained" disabled={isSubmitting} size="large">
                  {isSubmitting ? '发送中...' : '发送验证码'}
                </Button>

                {GOOGLE_CLIENT_ID && (
                  <>
                    <Divider sx={{ my: 1 }}>或</Divider>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <div ref={googleBtnRef} />
                    </Box>
                  </>
                )}
              </>
            )}

            {step === 'code' && (
              <>
                <TextField
                  label="验证码"
                  value={code}
                  onChange={(event) => {
                    const v = event.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(v);
                  }}
                  placeholder="输入 6 位验证码"
                  inputProps={{
                    maxLength: 6,
                    inputMode: 'numeric',
                    style: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
                  }}
                  required
                  fullWidth
                  autoFocus
                />

                <FormControlLabel
                  control={<Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />}
                  label="保持登录"
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || code.length !== 6}
                  size="large"
                >
                  {isSubmitting ? '验证中...' : '登录'}
                </Button>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button
                    size="small"
                    onClick={() => { setStep('email'); setCode(''); setErrorMessage(''); }}
                  >
                    换个邮箱
                  </Button>
                  <Button
                    size="small"
                    disabled={countdown > 0 || isSubmitting}
                    onClick={handleResendCode}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
                  </Button>
                </Stack>
              </>
            )}

            <Typography variant="body2" color="text.secondary">
              还没有账号？
              <Link component={RouterLink} to="/apply" sx={{ ml: 0.5 }}>
                申请加入
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
