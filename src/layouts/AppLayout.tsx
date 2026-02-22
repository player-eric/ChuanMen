import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import {
  AppBar,
  Avatar,
  Badge,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Box,
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
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/auth/AuthContext';
import { useColorMode } from '@/AppProviders';

const pages = [
  { id: '', icon: <HomeRoundedIcon />, label: '动态' },
  { id: 'events', icon: <EventRoundedIcon />, label: '活动' },
  { id: 'discover', icon: <ThumbUpRoundedIcon />, label: '推荐' },
  { id: 'cards', icon: <MailRoundedIcon />, label: '感谢卡' },
  { id: 'profile', icon: <PersonRoundedIcon />, label: '我' },
  { id: 'about', icon: <InfoOutlinedIcon />, label: '关于' },
];

function getTitle(pathname: string): string {
  if (pathname === '/') return '动态';
  if (pathname === '/events') return '活动';
  if (pathname.startsWith('/events/')) {
    if (pathname === '/events/proposals') return '活动提案';
    if (pathname === '/events/proposals/new') return '添加想法';
    if (pathname === '/events/history') return '活动记录';
    if (pathname === '/events/small-group/new') return '发起小局';
    return '活动详情';
  }
  if (pathname === '/discover') return '推荐';
  if (pathname === '/discover/movie') return '电影推荐';
  if (pathname === '/discover/recipe') return '菜谱推荐';
  if (pathname === '/discover/music') return '音乐推荐';
  if (pathname === '/discover/place') return '好店推荐';
  if (pathname === '/discover/movie/add') return '添加电影';
  if (pathname === '/discover/recipe/add') return '添加菜谱';
  if (pathname === '/discover/music/add') return '添加音乐';
  if (pathname === '/discover/place/add') return '添加好店';
  if (/^\/discover\/(movie|recipe|music|place)\/.+/.test(pathname) && !pathname.endsWith('/add')) return '推荐详情';
  if (pathname.startsWith('/discover/movies/')) return '电影详情';
  if (pathname === '/cards') return '感谢卡';
  if (pathname === '/profile') return '我的页面';
  if (pathname === '/members') return '成员墙';
  if (pathname.startsWith('/members/')) return decodeURIComponent(pathname.split('/members/')[1]);
  if (pathname === '/about') return '关于串门儿';
  if (pathname === '/about/principle') return '串门原则';
  if (pathname === '/about/host_guide') return 'Host 手册';
  if (pathname === '/about/letter') return '串门来信';
  if (pathname === '/about/about') return '关于我们';
  return '串门儿';
}

function getBackTarget(pathname: string): string | null {
  if (pathname === '/about') return '/';
  if (pathname.startsWith('/about/')) return '/about';
  if (pathname === '/members') return '/about';
  if (pathname.startsWith('/members/')) return null; // use browser back
  if (pathname === '/events/proposals' || pathname === '/events/history' || pathname.startsWith('/events/')) return '/events';
  if (pathname.startsWith('/discover/movies/')) return '/discover';
  if (pathname.startsWith('/discover/movie/')) return '/discover/movie';
  if (pathname.startsWith('/discover/recipe/')) return '/discover/recipe';
  if (pathname.startsWith('/discover/music/')) return '/discover/music';
  if (pathname.startsWith('/discover/place/')) return '/discover/place';
  if (pathname === '/discover/movie' || pathname === '/discover/recipe' || pathname === '/discover/music' || pathname === '/discover/place') return '/discover';
  return null;
}

export default function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user, setUser } = useAuth();
  const { mode, toggleColorMode } = useColorMode();

  const title = getTitle(pathname);
  const backTarget = getBackTarget(pathname);
  const isSubPage = pathname === '/about' || pathname === '/members' || pathname.startsWith('/members/');
  const isDetailPage = pathname.startsWith('/members/');
  const showBackButton = isSubPage && pathname !== '/about';

  const activeTab = pages.find((p) => {
    if (p.id === '' && pathname === '/') return true;
    if (p.id === 'about' && (pathname === '/about' || pathname === '/members' || pathname.startsWith('/members/'))) return true;
    if (p.id === 'events' && pathname.startsWith('/events')) return true;
    if (p.id === 'discover' && pathname.startsWith('/discover')) return true;
    return pathname === `/${p.id}`;
  })?.id ?? '';

  useEffect(() => {
    document.title = `串门儿 - ${title}`;
  }, [title]);

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
              {showBackButton && (
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
              <IconButton size="small" onClick={toggleColorMode} aria-label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>
                {mode === 'dark' ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
              </IconButton>
              <Badge color="warning" variant="dot" invisible={pathname !== '/'}>
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
          key={pathname}
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: 2,
            pb: { xs: 10, md: 3 },
            maxWidth: 1100,
            mx: 'auto',
          }}
        >
          <Outlet context={{ isEmpty: false }} />
        </Box>

        {!isDesktop && (
          <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: 1, borderColor: 'divider' }} elevation={6}>
            <BottomNavigation
              showLabels
              value={activeTab}
              onChange={(_, value) => navigate(value === '' ? '/' : `/${value}`)}
              sx={{ justifyContent: 'center', gap: 0.5, px: 0.5 }}
            >
              {pages.map((p) => (
                <BottomNavigationAction
                  key={p.id}
                  value={p.id}
                  label={p.label}
                  icon={p.icon}
                  sx={{
                    minWidth: 0,
                    maxWidth: 'none',
                    px: 0.75,
                    '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' },
                  }}
                />
              ))}
            </BottomNavigation>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
