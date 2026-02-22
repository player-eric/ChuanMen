import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

export default function AdminSettingsPage() {
  const [communityName, setCommunityName] = useState('串门儿');
  const [maxMembers, setMaxMembers] = useState('50');
  const [requireReferral, setRequireReferral] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [dormantMonths, setDormantMonths] = useState('3');
  const [defaultEventSize, setDefaultEventSize] = useState('8');
  const [cancelPenalty, setCancelPenalty] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  return (
    <Stack spacing={3}>
      {/* Community settings */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🏠 社区设置</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="社区名称"
                fullWidth size="small"
                value={communityName}
                onChange={(e) => setCommunityName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="最大成员数"
                fullWidth size="small" type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="默认活动人数上限"
                fullWidth size="small" type="number"
                value={defaultEventSize}
                onChange={(e) => setDefaultEventSize(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="休眠判定（月）"
                fullWidth size="small" type="number"
                value={dormantMonths}
                onChange={(e) => setDormantMonths(e.target.value)}
                helperText="连续 N 个月不活跃则标记为休眠"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Membership settings */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>👤 成员资格</Typography>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>需要推荐人</Typography>
                <Typography variant="caption" color="text.secondary">新申请必须有现有成员推荐</Typography>
              </Box>
              <Switch checked={requireReferral} onChange={(e) => setRequireReferral(e.target.checked)} />
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>自动批准</Typography>
                <Typography variant="caption" color="text.secondary">有推荐人的申请自动通过（跳过人工审核）</Typography>
              </Box>
              <Switch checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>取消惩罚机制</Typography>
                <Typography variant="caption" color="text.secondary">无故缺席 2 次暂停 1 个月报名权限</Typography>
              </Box>
              <Switch checked={cancelPenalty} onChange={(e) => setCancelPenalty(e.target.checked)} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Notification settings */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🔔 通知设置</Typography>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>邮件通知</Typography>
                <Typography variant="caption" color="text.secondary">活动创建、新申请等发送邮件通知管理员</Typography>
              </Box>
              <Switch checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Admin accounts */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🔐 管理员账号</Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>Yuan</Typography>
                <Typography variant="caption" color="text.secondary">cm@gmail.com</Typography>
              </Box>
              <Chip label="超级管理员" size="small" color="error" variant="outlined" />
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>大橙子</Typography>
                <Typography variant="caption" color="text.secondary">dachengzi@example.com</Typography>
              </Box>
              <Chip label="管理员" size="small" color="primary" variant="outlined" />
            </Stack>
          </Stack>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              测试管理员账号：<strong>cm@gmail.com</strong>（登录后自动获得管理员权限）
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Save */}
      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button variant="outlined">重置</Button>
        <Button variant="contained">保存设置</Button>
      </Stack>
    </Stack>
  );
}
