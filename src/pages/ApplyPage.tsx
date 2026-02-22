import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';

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
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    location: '',
    bio: '',
    selfAsFriend: '',
    idealFriend: '',
    participationPlan: '',
    email: '',
    wechatId: '',
    referralSource: '',
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const requiredFilled = form.displayName && form.location && form.bio && form.selfAsFriend && form.idealFriend && form.participationPlan && form.email && form.wechatId;

  const handleSubmit = () => {
    if (!requiredFilled) return;
    // TODO: POST /api/apply
    setSubmitted(true);
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

      <TextField
        label="你可能会怎样参与串门儿？"
        required
        multiline
        minRows={3}
        value={form.participationPlan}
        onChange={update('participationPlan')}
      />

      <TextField
        label="Email"
        required
        type="email"
        value={form.email}
        onChange={update('email')}
        helperText="建议填写 Google 邮箱，方便后续一键登录"
      />

      <TextField
        label="微信号"
        required
        value={form.wechatId}
        onChange={update('wechatId')}
        helperText="运营联络用，不会公开展示"
      />

      <TextField
        label="从哪知道串门儿的？"
        value={form.referralSource}
        onChange={update('referralSource')}
        helperText="可选"
      />

      {/* TODO: Cover image upload */}
      <Alert severity="info">封面图上传功能即将上线（可选）</Alert>

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
    </Stack>
  );
}
