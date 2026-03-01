import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { submitApplication } from '@/lib/domainApi';
import type { GoogleProfile } from '@/lib/domainApi';
import { ImageUpload } from '@/components/ImageUpload';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContactSupportRoundedIcon from '@mui/icons-material/ContactSupportRounded';

const welcomeText = `你好，欢迎来串门儿！

串门儿是一个重建真实联结的计划，是个申请制的共创社区，欢迎你的加入！

• 相比对这个世界的不满，我们更希望通过自己做一些事，让这个世界更接近我们想要的样子
• 相比萍水相逢，我们更希望能够有深度的交流和长久的联系
• 相比一起吃喝玩乐，我们更希望能真诚的在乎彼此，提供力所能及的帮助
• 相比其乐融融，我们更希望礼貌但真诚的表达和沟通

感谢你愿意花时间回答问题，问卷大概需要15分钟时间完成。你的回答我们会认真阅读，并给予回应。

如果通过申请，我们会邀请你进入"共创群"，这份问卷的内容会分享给所有会员，同时你也会看到其他朋友的答案。`;

export default function ApplyPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Google profile from login page redirect
  const googleProfile = (location.state as { googleProfile?: GoogleProfile } | null)?.googleProfile;

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ displayName?: string; email?: string }>({});
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [form, setForm] = useState({
    displayName: googleProfile?.name ?? '',
    location: '',
    bio: '',
    selfAsFriend: '',
    idealFriend: '',
    participationPlan: [] as string[],
    email: googleProfile?.email ?? '',
    wechatId: '',
    referralSource: '',
    coverImageUrl: googleProfile?.picture ?? '',
    birthday: '',
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const requiredFilled = form.displayName && form.location && form.bio && form.selfAsFriend && form.idealFriend && form.participationPlan.length > 0 && form.email && form.wechatId;

  const handleSubmit = async () => {
    if (!requiredFilled) return;
    setSubmitError(null);
    setFieldErrors({});
    try {
      await submitApplication({
        ...form,
        participationPlan: form.participationPlan.join(', '),
        googleId: googleProfile?.googleId,
        subscribeNewsletter,
        birthday: form.birthday || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      if (err.errorCode === 'EMAIL_EXISTS') {
        setFieldErrors({ email: '该邮箱已被注册' });
      } else if (err.errorCode === 'NAME_EXISTS') {
        setFieldErrors({ displayName: '该用户名已被使用' });
      } else {
        setSubmitError(err.message || '提交失败，请稍后再试');
      }
    }
  };

  if (submitted) {
    return (
      <Stack spacing={3} alignItems="center" sx={{ py: 8, px: 2, textAlign: 'center' }}>
        <Typography variant="h3">✉</Typography>
        <Typography variant="h5" fontWeight={700}>已收到你的申请</Typography>
        <Typography variant="body1" color="text.secondary">
          我们会在 3 天内通过 Email 回复你
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/about')}>
          在此期间，先看看串门儿是什么 →
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
            {welcomeText}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={700}>申请表</Typography>

      <TextField
        label="怎样称呼你？"
        required
        value={form.displayName}
        onChange={update('displayName')}
        placeholder="显示名，不要求实名"
        error={!!fieldErrors.displayName}
        helperText={fieldErrors.displayName}
      />

      <TextField
        label="你在哪个城市或地区？"
        required
        value={form.location}
        onChange={update('location')}
        placeholder="如 Edison, NJ"
      />

      <TextField
        label="和大家打个招呼吧"
        required
        multiline
        minRows={3}
        value={form.bio}
        onChange={update('bio')}
        placeholder="自我介绍（建议 ≥20 字）"
      />

      <TextField
        label="你觉得自己是一个什么样的朋友？"
        required
        multiline
        minRows={3}
        value={form.selfAsFriend}
        onChange={update('selfAsFriend')}
      />

      <TextField
        label="你最好的朋友是什么样子的？"
        required
        multiline
        minRows={3}
        value={form.idealFriend}
        onChange={update('idealFriend')}
      />

      <FormControl required>
        <FormLabel sx={{ fontWeight: 700, mb: 1 }}>你可能会怎么参与串门儿 *</FormLabel>
        <FormGroup>
          {[
            '仅参加活动',
            '参加活动，提供反馈',
            '可以做Host组织活动，家里客厅还不太想开放',
            '可以做Host组织活动，让朋友们来家里串门',
            '可以做志愿者或其他（比如拍照摄影、视频剪辑、活动支持等）',
          ].map((option) => (
            <FormControlLabel
              key={option}
              control={
                <Checkbox
                  checked={form.participationPlan.includes(option)}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      participationPlan: e.target.checked
                        ? [...prev.participationPlan, option]
                        : prev.participationPlan.filter((v) => v !== option),
                    }));
                  }}
                />
              }
              label={option}
            />
          ))}
        </FormGroup>
      </FormControl>

      <TextField
        label="Email"
        required
        type="email"
        value={form.email}
        onChange={update('email')}
        helperText={fieldErrors.email || '建议填写 Google 邮箱，方便后续一键登录'}
        error={!!fieldErrors.email}
        disabled={!!googleProfile?.email}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={subscribeNewsletter}
            onChange={(e) => setSubscribeNewsletter(e.target.checked)}
          />
        }
        label="订阅「串门儿来信」（社区周报和活动通知）"
        sx={{ mt: -1 }}
      />

      <TextField
        label="微信号"
        required
        value={form.wechatId}
        onChange={update('wechatId')}
        helperText="运营联络用，不会公开展示"
      />

      <TextField
        label="你的生日（可选）"
        type="date"
        value={form.birthday}
        onChange={update('birthday')}
        helperText="用于社区生日祝福，通过后也可以在设置里修改"
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <TextField
        label="从哪知道串门儿的？"
        value={form.referralSource}
        onChange={update('referralSource')}
        helperText="可选"
      />

      <Box>
        <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>封面图（可选）</Typography>
        <ImageUpload
          value={form.coverImageUrl || null}
          onChange={(url) => setForm((prev) => ({ ...prev, coverImageUrl: url }))}
          category="cover"
          width="100%"
          height={160}
          shape="rect"
          maxSize={10 * 1024 * 1024}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          封面图将展示在你的个人页面顶部，通过申请后也可以在设置中上传
        </Typography>
      </Box>

      {submitError && (
        <Alert severity="error">{submitError}</Alert>
      )}

      <Button
        variant="contained"
        size="large"
        onClick={handleSubmit}
        disabled={!requiredFilled}
      >
        提交申请
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Button size="small" onClick={() => navigate('/login')}>已有账号？去登录</Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 1 }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<ContactSupportRoundedIcon />}
          onClick={() => setFeedbackOpen(true)}
          sx={{ opacity: 0.7 }}
        >
          有问题？联系管理员
        </Button>
      </Box>

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        defaultName={form.displayName}
        defaultEmail={form.email}
        page="申请页"
      />
    </Stack>
  );
}
