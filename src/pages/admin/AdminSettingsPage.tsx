import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { fetchSiteConfig, updateSiteConfig, fetchMembersApi } from '@/lib/domainApi';

interface CommunityConfig {
  communityName: string;
  maxMembers: number;
  requireReferral: boolean;
  autoApprove: boolean;
  dormantMonths: number;
  defaultEventSize: number;
  cancelPenalty: boolean;
  emailNotifications: boolean;
}

const defaultConfig: CommunityConfig = {
  communityName: '串门儿',
  maxMembers: 50,
  requireReferral: true,
  autoApprove: false,
  dormantMonths: 3,
  defaultEventSize: 8,
  cancelPenalty: true,
  emailNotifications: true,
};

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<CommunityConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [admins, setAdmins] = useState<{ id: string; name: string; email: string; role: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [val, members] = await Promise.all([
          fetchSiteConfig<CommunityConfig>('community').catch(() => null),
          fetchMembersApi().catch(() => []),
        ]);
        if (val) setConfig(val);
        setAdmins((members ?? []).filter((m: any) => m.role === 'admin').map((m: any) => ({
          id: m.id,
          name: m.name ?? '',
          email: m.email ?? '',
          role: m.role ?? 'admin',
        })));
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSiteConfig('community', config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const val = await fetchSiteConfig<CommunityConfig>('community').catch(() => null);
      if (val) setConfig(val);
      else setConfig(defaultConfig);
    } catch { setConfig(defaultConfig); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  return (
    <Stack spacing={3}>
      {saved && <Alert severity="success">设置已保存</Alert>}

      {/* Community settings */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🏠 社区设置</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="社区名称"
                fullWidth size="small"
                value={config.communityName}
                onChange={(e) => setConfig({ ...config, communityName: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="最大成员数"
                fullWidth size="small" type="number"
                value={config.maxMembers}
                onChange={(e) => setConfig({ ...config, maxMembers: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="默认活动人数上限"
                fullWidth size="small" type="number"
                value={config.defaultEventSize}
                onChange={(e) => setConfig({ ...config, defaultEventSize: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="休眠判定（月）"
                fullWidth size="small" type="number"
                value={config.dormantMonths}
                onChange={(e) => setConfig({ ...config, dormantMonths: Number(e.target.value) })}
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
              <Switch checked={config.requireReferral} onChange={(e) => setConfig({ ...config, requireReferral: e.target.checked })} />
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>自动批准</Typography>
                <Typography variant="caption" color="text.secondary">有推荐人的申请自动通过（跳过人工审核）</Typography>
              </Box>
              <Switch checked={config.autoApprove} onChange={(e) => setConfig({ ...config, autoApprove: e.target.checked })} />
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" fontWeight={600}>取消惩罚机制</Typography>
                <Typography variant="caption" color="text.secondary">无故缺席 2 次暂停 1 个月报名权限</Typography>
              </Box>
              <Switch checked={config.cancelPenalty} onChange={(e) => setConfig({ ...config, cancelPenalty: e.target.checked })} />
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
              <Switch checked={config.emailNotifications} onChange={(e) => setConfig({ ...config, emailNotifications: e.target.checked })} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Admin accounts — loaded from real user data */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>🔐 管理员账号</Typography>
          <Stack spacing={1.5}>
            {admins.map((a, i) => (
              <Box key={a.id}>
                {i > 0 && <Divider sx={{ mb: 1.5 }} />}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{a.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.email}</Typography>
                  </Box>
                  <Chip label="管理员" size="small" color="primary" variant="outlined" />
                </Stack>
              </Box>
            ))}
            {admins.length === 0 && (
              <Typography variant="caption" color="text.secondary">暂无管理员账号数据</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Save */}
      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        <Button variant="outlined" onClick={handleReset} disabled={saving}>重置</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
      </Stack>
    </Stack>
  );
}
