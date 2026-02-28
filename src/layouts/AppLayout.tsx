import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import {
  AppBar,
  Avatar,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Divider,
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
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/auth/AuthContext';
import { useColorMode } from '@/AppProviders';

/* ── Bottom Tab 栏: 5 tabs (v2.1 §4.0) ── */
const bottomTabs = [
  { id: '', icon: <HomeRoundedIcon />, label: '动态', auth: true },
  { id: 'discover', icon: <ThumbUpRoundedIcon />, label: '推荐', auth: true },
  { id: 'events', icon: <EventRoundedIcon />, label: '活动', auth: true },
  { id: 'cards', icon: <MailRoundedIcon />, label: '感谢卡', auth: true },
  { id: 'profile', icon: <PersonRoundedIcon />, label: '我', auth: true },
];

/** Routes that require login */
const authPaths = ['/', '/discover', '/events', '/cards', '/profile', '/members', '/settings'];

function getTitle(pathname: string): string {
  if (pathname === '/') return '动态';
  if (pathname === '/events') return '活动';
  if (pathname.startsWith('/events/')) {
    if (pathname === '/events/proposals') return '活动创意';
    if (pathname === '/events/proposals/new') return '添加创意';
    if (/^\/events\/proposals\/\d+$/.test(pathname)) return '创意详情';
    if (pathname === '/events/history') return '活动记录';
    if (pathname === '/events/new') return '发起活动';
    if (pathname === '/events/small-group/new') return '发起小聚';
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
  if (pathname === '/settings') return '账号设置';
  if (pathname === '/members') return '成员墙';
  if (pathname.startsWith('/members/')) return decodeURIComponent(pathname.split('/members/')[1]);
  if (pathname === '/about') return '关于串门儿';
  if (pathname === '/about/principle') return '串门原则';
  if (pathname === '/about/host_guide') return 'Host 手册';
  if (pathname === '/about/letter') return '串门来信';
  if (pathname === '/about/about') return '关于我们';
  if (pathname === '/apply') return '申请加入';
  return '串门儿';
}

function getBackTarget(pathname: string): string | null {
  if (pathname.startsWith('/about/')) return '/about';
  if (pathname === '/members') return '/';
  if (pathname.startsWith('/members/')) return null;
  if (pathname === '/settings') return null;
  if (pathname === '/apply') return '/about';
  if (pathname.startsWith('/events/proposals/')) return '/events';
  if (pathname === '/events/history' || pathname.startsWith('/events/')) return '/events';
  if (pathname.startsWith('/discover/movies/')) return '/discover';
  if (pathname.startsWith('/discover/movie/')) return '/discover/movie';
  if (pathname.startsWith('/discover/recipe/')) return '/discover/recipe';
  if (pathname.startsWith('/discover/music/')) return '/discover/music';
  if (pathname.startsWith('/discover/place/')) return '/discover/place';
  if (pathname === '/discover/movie' || pathname === '/discover/recipe' || pathname === '/discover/music' || pathname === '/discover/place') return '/discover';
  return null;
}

/** Routes that show a back button instead of the hamburger */
function isSubRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/about/') ||
    pathname === '/members' ||
    pathname.startsWith('/members/') ||
    pathname === '/settings' ||
    pathname === '/apply' ||
    pathname.startsWith('/events/') ||
    pathname.startsWith('/discover/movies/') ||
    pathname.startsWith('/discover/movie') ||
    pathname.startsWith('/discover/recipe') ||
    pathname.startsWith('/discover/music') ||
    pathname.startsWith('/discover/place')
  );
}

export default function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user, setUser, hydrated } = useAuth();
  const { mode, toggleColorMode } = useColorMode();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const title = getTitle(pathname);
  const backTarget = getBackTarget(pathname);
  const showBack = isSubRoute(pathname);

  // Guest access: check if current path needs auth
  const needsAuth = hydrated && !user && authPaths.some((p) => p === '/' ? pathname === '/' : pathname.startsWith(p));

  // Tabs visible to current user
  const visibleTabs = user ? bottomTabs : [];

  const activeTab = bottomTabs.find((p) => {
    if (p.id === '' && pathname === '/') return true;
    if (p.id === 'events' && pathname.startsWith('/events')) return true;
    if (p.id === 'discover' && pathname.startsWith('/discover')) return true;
    return pathname === `/${p.id}`;
  })?.id ?? '';

  useEffect(() => {
    document.title = `串门儿 - ${title}`;
  }, [title]);

  const handleDrawerNav = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  /* ── Hamburger Drawer (v2.1 §4.0) ── */
  const drawerContent = (
    <Box sx={{ width: 280 }}>
      {/* User info section */}
      <Box sx={{ p: 2, pt: 3 }}>
        {user ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ width: 40, height: 40 }} src={user.avatar || undefined}>
              {user.name?.[0] ?? 'U'}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>{user.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user.email}</Typography>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Button variant="outlined" fullWidth onClick={() => handleDrawerNav('/login')}>
              登录
            </Button>
            <Button variant="text" fullWidth onClick={() => handleDrawerNav('/apply')}>
              申请加入
            </Button>
          </Stack>
        )}
      </Box>
      <Divider />

      {/* Navigation */}
      <List>
        {user && (
          <ListItemButton onClick={() => handleDrawerNav('/members')}>
            <ListItemIcon><PeopleRoundedIcon /></ListItemIcon>
            <ListItemText primary="成员墙" />
          </ListItemButton>
        )}
        <ListItemButton onClick={() => handleDrawerNav('/about')}>
          <ListItemIcon><InfoOutlinedIcon /></ListItemIcon>
          <ListItemText primary="关于串门儿" />
        </ListItemButton>
      </List>
      <Divider />

      {/* More */}
      {user && (
        <>
          <List>
            <ListItemButton onClick={() => handleDrawerNav('/settings')}>
              <ListItemIcon><SettingsRoundedIcon /></ListItemIcon>
              <ListItemText primary="账号设置" />
            </ListItemButton>
            {user.role === 'admin' && (
              <ListItemButton onClick={() => handleDrawerNav('/admin')}>
                <ListItemIcon><AdminPanelSettingsRoundedIcon /></ListItemIcon>
                <ListItemText primary="管理后台" />
              </ListItemButton>
            )}
          </List>
          <Divider />
          <List>
            <ListItemButton onClick={() => { setDrawerOpen(false); setUser(null); navigate('/'); }}>
              <ListItemIcon><LogoutRoundedIcon /></ListItemIcon>
              <ListItemText primary="退出登录" />
            </ListItemButton>
          </List>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: 'background.default', display: 'flex',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: mode === 'dark' ? 0.12 : 0.18,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
      },
    }}>
      {/* Desktop sidebar (v2.1 §4.0) */}
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
            <Stack direction="row" spacing={1} alignItems="center" sx={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              <img src="/logo.png" alt="" style={{ height: 28, width: 'auto' }} />
              <Typography variant="h6">串门儿</Typography>
            </Stack>
          </Toolbar>
          <Box sx={{ px: 1 }}>
            {visibleTabs.length > 0 && (
            <List>
              {visibleTabs.map((p) => {
                const isActive = activeTab === p.id;
                return (
                  <ListItemButton key={p.id} selected={isActive} onClick={() => navigate(p.id === '' ? '/' : `/${p.id}`)}>
                    <ListItemIcon>{p.icon}</ListItemIcon>
                    <ListItemText primary={p.label} />
                  </ListItemButton>
                );
              })}
            </List>
            )}
            <Divider sx={{ my: 1 }} />
            <List>
              {user && (
                <ListItemButton selected={pathname === '/members'} onClick={() => navigate('/members')}>
                  <ListItemIcon><PeopleRoundedIcon /></ListItemIcon>
                  <ListItemText primary="成员墙" />
                </ListItemButton>
              )}
              <ListItemButton selected={pathname.startsWith('/about')} onClick={() => navigate('/about')}>
                <ListItemIcon><InfoOutlinedIcon /></ListItemIcon>
                <ListItemText primary="关于串门儿" />
              </ListItemButton>
              {user && (
                <ListItemButton selected={pathname === '/settings'} onClick={() => navigate('/settings')}>
                  <ListItemIcon><SettingsRoundedIcon /></ListItemIcon>
                  <ListItemText primary="账号设置" />
                </ListItemButton>
              )}
              {user?.role === 'admin' && (
                <ListItemButton selected={pathname.startsWith('/admin')} onClick={() => navigate('/admin')}>
                  <ListItemIcon><AdminPanelSettingsRoundedIcon /></ListItemIcon>
                  <ListItemText primary="管理后台" />
                </ListItemButton>
              )}
            </List>
          </Box>
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Top AppBar: hamburger/back + title + status (v2.1 §4.0) */}
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(10px)', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {showBack ? (
                <IconButton
                  size="small"
                  onClick={() => {
                    if (backTarget) navigate(backTarget);
                    else navigate(-1);
                  }}
                >
                  <ArrowBackIosNewRoundedIcon fontSize="small" />
                </IconButton>
              ) : (
                !isDesktop && (
                  <IconButton size="small" onClick={() => setDrawerOpen(true)}>
                    <MenuRoundedIcon />
                  </IconButton>
                )
              )}
              {!isDesktop && pathname === '/' && (
                <img src="/logo.png" alt="" style={{ height: 24, width: 'auto', marginRight: 4 }} />
              )}
              <Typography
                variant="h6"
                sx={{ cursor: pathname === '/' ? 'pointer' : 'default' }}
                onClick={() => { if (pathname === '/') navigate('/about'); }}
              >
                {title}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={toggleColorMode} aria-label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>
                {mode === 'dark' ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
              </IconButton>
              {user ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 28, height: 28, cursor: 'pointer' }} src={user.avatar || undefined} onClick={() => navigate('/profile')}>
                    {user.name?.[0] ?? 'U'}
                  </Avatar>
                  <Button size="small" color="inherit" onClick={() => { setUser(null); navigate('/'); }}>
                    退出
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="text" color="inherit" onClick={() => navigate('/login')}>
                    登录
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => navigate('/apply')}>
                    申请加入
                  </Button>
                </Stack>
              )}
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Mobile hamburger drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ slotProps: { backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.5)' } } } }}
        >
          {drawerContent}
        </Drawer>

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
          {needsAuth ? (
            <Stack spacing={2} alignItems="center" sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700}>需要登录才能查看</Typography>
              <Typography variant="body2" color="text.secondary">
                登录后可查看动态、活动、推荐和感谢卡
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={() => navigate('/login')}>去登录</Button>
                <Button variant="outlined" onClick={() => navigate('/apply')}>申请加入</Button>
              </Stack>
            </Stack>
          ) : (
            <Outlet />
          )}
        </Box>

        {/* Bottom Tab Bar — 5 tabs, hidden when not logged in (v2.1 §4.0) */}
        {!isDesktop && visibleTabs.length > 0 && (
          <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: 1, borderColor: 'divider' }} elevation={6}>
            <BottomNavigation
              showLabels
              value={activeTab}
              onChange={(_, value) => navigate(value === '' ? '/' : `/${value}`)}
              sx={{ justifyContent: 'center', gap: 0.5, px: 0.5 }}
            >
              {visibleTabs.map((p) => (
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
