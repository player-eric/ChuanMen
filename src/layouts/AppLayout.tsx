import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import ThumbUpRoundedIcon from '@mui/icons-material/ThumbUpRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/auth/AuthContext';

const pages = [
  { id: '', icon: <HomeRoundedIcon />, label: '动态' },
  { id: 'events', icon: <EventRoundedIcon />, label: '活动' },
  { id: 'discover', icon: <ThumbUpRoundedIcon />, label: '推荐' },
  { id: 'cards', icon: <MailRoundedIcon />, label: '感谢卡' },
  { id: 'profile', icon: <PersonRoundedIcon />, label: '我' },
];

function getTitle(pathname: string): string {
  if (pathname === '/') return '串门儿';
  if (pathname === '/events') return '活动';
  if (pathname === '/discover') return '推荐';
  if (pathname === '/cards') return '感谢卡';
  if (pathname === '/profile') return '我的页面';
  if (pathname === '/members') return '成员墙';
  if (pathname.startsWith('/members/')) return decodeURIComponent(pathname.split('/members/')[1]);
  if (pathname === '/about') return '关于串门儿';
  return '串门儿';
}

function getBackTarget(pathname: string): string | null {
  if (pathname === '/about') return '/';
  if (pathname === '/members') return '/about';
  if (pathname.startsWith('/members/')) return null; // use browser back
  return null;
}

export default function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user, setUser } = useAuth();
  const [isEmpty, setIsEmpty] = useState(false);

  const title = getTitle(pathname);
  const backTarget = getBackTarget(pathname);
  const isSubPage = pathname === '/about' || pathname === '/members' || pathname.startsWith('/members/');
  const isDetailPage = pathname.startsWith('/members/');

  const activeTab = pages.find((p) => {
    if (p.id === '' && (pathname === '/' || pathname === '/about' || pathname === '/members' || pathname.startsWith('/members/'))) return true;
    return pathname === `/${p.id}`;
  })?.id ?? '';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex' }}>
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', borderRightColor: 'divider' },
          }}
        >
          <Toolbar>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">串门儿</Typography>
              <IconButton size="small" onClick={() => navigate('/about')}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Toolbar>
          <Box sx={{ px: 1 }}>
            <List>
              {pages.map((p) => {
                const isActive = activeTab === p.id;
                return (
                  <ListItemButton key={p.id} selected={isActive} onClick={() => navigate(p.id === '' ? '/' : `/${p.id}`)}>
                    <ListItemIcon>{p.icon}</ListItemIcon>
                    <ListItemText primary={p.label} />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {isSubPage && (
                <IconButton
                  size="small"
                  onClick={() => {
                    if (isDetailPage) navigate(-1);
                    else if (backTarget) navigate(backTarget);
                  }}
                >
                  <ArrowBackIosNewRoundedIcon fontSize="small" />
                </IconButton>
              )}
              <Typography
                variant="h6"
                sx={{ cursor: !isSubPage ? 'pointer' : 'default' }}
                onClick={() => {
                  if (!isSubPage) navigate('/about');
                }}
              >
                {title}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                color={isEmpty ? 'warning' : 'default'}
                label={isEmpty ? '新用户' : '老用户'}
                onClick={() => setIsEmpty(!isEmpty)}
              />
              <Badge color="warning" variant="dot" invisible={pathname !== '/' || isEmpty}>
                <Avatar sx={{ width: 28, height: 28 }} src={user?.avatar || undefined}>
                  {user?.name?.[0] ?? 'U'}
                </Avatar>
              </Badge>
              {user ? (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 140 }} noWrap>
                    {user.name}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setUser(null);
                      navigate('/');
                    }}
                  >
                    退出
                  </Button>
                </>
              ) : (
                <Stack direction="row" spacing={0.5}>
                  <Button size="small" variant="text" onClick={() => navigate('/login')}>
                    登录
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => navigate('/register')}>
                    注册
                  </Button>
                </Stack>
              )}
            </Stack>
          </Toolbar>
        </AppBar>

        <Box
          key={pathname + String(isEmpty)}
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: 2,
            pb: { xs: 10, md: 3 },
            maxWidth: 1100,
            mx: 'auto',
          }}
        >
          <Outlet context={{ isEmpty }} />
        </Box>

        {!isDesktop && (
          <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: 1, borderColor: 'divider' }} elevation={6}>
            <BottomNavigation
              showLabels
              value={activeTab}
              onChange={(_, value) => navigate(value === '' ? '/' : `/${value}`)}
            >
              {pages.map((p) => (
                <BottomNavigationAction key={p.id} value={p.id} label={p.label} icon={p.icon} />
              ))}
            </BottomNavigation>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
