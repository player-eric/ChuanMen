import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { firstNonEmoji } from '@/components/Atoms';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import FeedbackRoundedIcon from '@mui/icons-material/FeedbackRounded';
import QuizRoundedIcon from '@mui/icons-material/QuizRounded';
import { useAuth } from '@/auth/AuthContext';

const drawerWidth = 240;

const adminNav = [
  { id: '', icon: <DashboardRoundedIcon />, label: '数据看板' },
  { id: 'members', icon: <PeopleRoundedIcon />, label: '成员管理' },
  { id: 'events', icon: <EventRoundedIcon />, label: '活动管理' },
  { id: 'content', icon: <ArticleRoundedIcon />, label: '内容管理' },
  { id: 'cards', icon: <MailRoundedIcon />, label: '感谢卡管理' },
  { id: 'titles', icon: <MilitaryTechRoundedIcon />, label: '称号管理' },
  { id: 'task-presets', icon: <AssignmentRoundedIcon />, label: '分工预设' },
  { id: 'daily-questions', icon: <QuizRoundedIcon />, label: '每日话题' },
  { id: 'announcements', icon: <CampaignRoundedIcon />, label: '公告与里程碑' },
  { id: 'email', icon: <MarkEmailReadRoundedIcon />, label: '邮件管理' },
  { id: 'newsletters', icon: <EmailRoundedIcon />, label: '社区通讯' },
  { id: 'feedback', icon: <FeedbackRoundedIcon />, label: '用户反馈' },
  { id: 'community-info', icon: <EditNoteRoundedIcon />, label: '社群信息编辑' },
  { id: 'settings', icon: <SettingsRoundedIcon />, label: '系统设置' },
];

export default function AdminLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Guard: only admin can access
  if (!user || user.role !== 'admin') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={700}>⛔ 无权限访问</Typography>
          <Typography color="text.secondary">仅管理员可以访问管理后台</Typography>
          <Button variant="outlined" onClick={() => navigate('/')}>返回首页</Button>
        </Stack>
      </Box>
    );
  }

  const currentPath = location.pathname.replace('/admin', '').replace(/^\//, '');

  const sidebar = (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Toolbar>
        <Typography variant="h6" fontWeight={700}>🛠 管理后台</Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1 }}>
        {adminNav.map((item) => (
          <ListItemButton
            key={item.id}
            selected={currentPath === item.id}
            onClick={() => {
              navigate(item.id ? `/admin/${item.id}` : '/admin');
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List sx={{ px: 1 }}>
        <ListItemButton onClick={() => { setMobileOpen(false); setFeedbackOpen(true); }}>
          <ListItemIcon><MailRoundedIcon /></ListItemIcon>
          <ListItemText primary="联系管理员" />
        </ListItemButton>
        <ListItemButton onClick={() => navigate('/')}>
          <ListItemIcon><ArrowBackRoundedIcon /></ListItemIcon>
          <ListItemText primary="返回前台" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          {sidebar}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {sidebar}
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(10px)' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {!isDesktop && (
                <IconButton size="small" onClick={() => setMobileOpen(true)}>
                  <MenuRoundedIcon />
                </IconButton>
              )}
              <Typography variant="h6">
                {adminNav.find((n) => n.id === currentPath)?.label ?? '管理后台'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">{user.name}</Typography>
              <Avatar sx={{ width: 28, height: 28 }}>{firstNonEmoji(user.name)}</Avatar>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        defaultName={user?.name ?? ''}
        defaultEmail={user?.email ?? ''}
        page={location.pathname}
        authorId={user?.id}
      />
    </Box>
  );
}
