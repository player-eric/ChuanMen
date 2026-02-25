import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { Ava } from '@/components/Atoms';
import { useColors } from '@/hooks/useColors';
import { feedItems } from '@/mock/data';

/* ═══ Types ═══ */
type ObjectType = 'event' | 'member' | 'movie' | 'book';

interface SelectedObject {
  type: ObjectType;
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  host?: string;
  navTarget?: string;
}

/* ═══ Data extraction from feedItems ═══ */

function useQuickActionData() {
  return useMemo(() => {
    const events: SelectedObject[] = [];
    const movieMap = new Map<string, SelectedObject>();
    const bookMap = new Map<string, SelectedObject>();
    const peopleBySrc = new Map<string, { name: string; ctx: string }>();

    for (const item of feedItems) {
      if (item.type === 'activity') {
        events.push({
          type: 'event',
          id: item.navTarget ?? '',
          title: item.title,
          subtitle: item.date,
          icon: '📅',
          host: item.name,
          navTarget: item.navTarget,
        });
        // collect people from this event (de-dup by name)
        for (const p of item.people) {
          if (!peopleBySrc.has(p)) {
            peopleBySrc.set(p, { name: p, ctx: item.title });
          }
        }
      }
      if (item.type === 'smallGroup' || item.type === 'compactSmallGroup') {
        events.push({
          type: 'event',
          id: item.navTarget ?? '',
          title: item.title,
          subtitle: item.date,
          icon: '📅',
          host: item.name,
          navTarget: item.navTarget,
        });
        for (const p of item.people) {
          if (!peopleBySrc.has(p)) {
            peopleBySrc.set(p, { name: p, ctx: item.title });
          }
        }
      }
      if (item.type === 'movie' || item.type === 'compactMovie') {
        if (!movieMap.has(item.title)) {
          movieMap.set(item.title, {
            type: 'movie',
            id: item.type === 'compactMovie' ? (item.navTarget ?? '') : '',
            title: item.title,
            subtitle: `${item.dir} · ${item.year}`,
            icon: '🎬',
            navTarget: item.type === 'compactMovie' ? item.navTarget : undefined,
          });
        }
      }
      if (item.type === 'book' || item.type === 'compactBook') {
        if (!bookMap.has(item.title)) {
          bookMap.set(item.title, {
            type: 'book',
            id: item.type === 'compactBook' ? (item.navTarget ?? '') : '',
            title: item.title,
            subtitle: `${item.author} · ${item.year}`,
            icon: '📖',
            navTarget: item.type === 'compactBook' ? item.navTarget : undefined,
          });
        }
      }
    }

    const recentEvents = events.slice(0, 5);
    const movies = [...movieMap.values()].slice(0, 3);
    const books = [...bookMap.values()].slice(0, 3);

    // people: exclude current user placeholder (Yuan), keep first 6
    const people = [...peopleBySrc.entries()]
      .map(([, v]) => v)
      .slice(0, 8);

    return { recentEvents, people, movies, books };
  }, []);
}

/* ═══ Action definitions per type ═══ */
interface QuickAction {
  icon: string;
  label: string;
  desc: string;
  key: string;
}

function actionsFor(obj: SelectedObject): QuickAction[] {
  switch (obj.type) {
    case 'event':
      return [
        { icon: '💬', label: '写评论', desc: '对这次活动说点什么', key: 'comment' },
        { icon: '📷', label: '上传照片', desc: '分享活动照片', key: 'photo' },
        { icon: '✉', label: `感谢 Host`, desc: `给${obj.host ?? 'Host'}寄一张感谢卡`, key: 'thank' },
        { icon: '📄', label: '查看详情', desc: '前往活动页面', key: 'detail' },
      ];
    case 'member':
      return [
        { icon: '✉', label: '寄感谢卡', desc: `给${obj.title}写一张感谢卡`, key: 'thank' },
        { icon: '📄', label: '查看主页', desc: `前往${obj.title}的主页`, key: 'detail' },
      ];
    case 'movie':
      return [
        { icon: '💬', label: '写评论', desc: '聊聊这部电影', key: 'comment' },
        { icon: '▲', label: '投票', desc: '想在下次电影夜看', key: 'vote' },
        { icon: '📄', label: '查看详情', desc: '前往电影页面', key: 'detail' },
      ];
    case 'book':
      return [
        { icon: '💬', label: '写评论', desc: '聊聊这本书', key: 'comment' },
        { icon: '▲', label: '投票', desc: '想在下次读书会讨论', key: 'vote' },
        { icon: '📄', label: '查看详情', desc: '前往书籍页面', key: 'detail' },
      ];
  }
}

/* ═══ QuickActionDialog ═══ */
interface QuickActionDialogProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'select' | 'actions' | 'comment' | 'photo';

export default function QuickActionDialog({ open, onClose }: QuickActionDialogProps) {
  const navigate = useNavigate();
  const c = useColors();
  const { recentEvents, people, movies, books } = useQuickActionData();

  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<SelectedObject | null>(null);
  const [search, setSearch] = useState('');
  const [commentText, setCommentText] = useState('');
  const [snack, setSnack] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const hasContent = recentEvents.length > 0;

  function reset() {
    setStep('select');
    setSelected(null);
    setSearch('');
    setCommentText('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSelect(obj: SelectedObject) {
    setSelected(obj);
    setStep('actions');
  }

  function handleSelectMember(name: string, ctx: string) {
    setSelected({
      type: 'member',
      id: name,
      title: name,
      subtitle: ctx,
      icon: '👤',
      navTarget: `/members/${encodeURIComponent(name)}`,
    });
    setStep('actions');
  }

  function handleAction(key: string) {
    if (!selected) return;

    switch (key) {
      case 'comment':
        setStep('comment');
        break;
      case 'photo':
        setStep('photo');
        fileRef.current?.click();
        break;
      case 'vote':
        setSnack('已投票！');
        setTimeout(handleClose, 800);
        break;
      case 'thank': {
        handleClose();
        const recipient = selected.type === 'member' ? selected.title : selected.host;
        navigate('/cards', { state: { prefillTo: recipient, eventCtx: selected.type === 'event' ? selected.title : undefined } });
        break;
      }
      case 'detail': {
        handleClose();
        if (selected.navTarget) {
          navigate(selected.navTarget);
        } else if (selected.type === 'member') {
          navigate(`/members/${encodeURIComponent(selected.title)}`);
        }
        break;
      }
    }
  }

  function handleCommentSend() {
    if (!commentText.trim()) return;
    setSnack('评论已发送！');
    setCommentText('');
    setTimeout(handleClose, 800);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSnack(`已上传 ${files.length} 张照片！`);
      setTimeout(handleClose, 800);
    }
    // reset file input
    if (fileRef.current) fileRef.current.value = '';
  }

  /* ─── Fallback for inactive users ─── */
  function renderEmptyState() {
    return (
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          你还没有参加过活动，先看看有什么可以参与的吧：
        </Typography>
        <List disablePadding>
          {[
            { icon: '📅', label: '看看最近的活动', desc: '报名参加一次活动', to: '/events' },
            { icon: '🎬', label: '推荐一部电影', desc: '去投票池选一部想看的', to: '/discover' },
            { icon: '💡', label: '提一个活动创意', desc: '想做什么告诉大家', to: '/events/proposals/new' },
          ].map((a) => (
            <ListItemButton
              key={a.to}
              onClick={() => { handleClose(); navigate(a.to); }}
              sx={{ borderRadius: 2, mb: 0.5, border: '1px solid', borderColor: 'divider' }}
            >
              <ListItemIcon sx={{ minWidth: 36, fontSize: 18 }}>{a.icon}</ListItemIcon>
              <ListItemText
                primary={a.label}
                secondary={a.desc}
                primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </ListItemButton>
          ))}
        </List>
      </Stack>
    );
  }

  /* ─── Search filter ─── */
  const q = search.trim().toLowerCase();

  const filteredEvents = q
    ? recentEvents.filter((e) => e.title.toLowerCase().includes(q))
    : recentEvents;

  const filteredPeople = q
    ? people.filter((p) => p.name.toLowerCase().includes(q))
    : people;

  const filteredMovies = q
    ? movies.filter((m) => m.title.toLowerCase().includes(q))
    : movies;

  const filteredBooks = q
    ? books.filter((b) => b.title.toLowerCase().includes(q))
    : books;

  const hasResults = filteredEvents.length + filteredPeople.length + filteredMovies.length + filteredBooks.length > 0;

  /* ─── Step 1: Object selection ─── */
  function renderSelectStep() {
    if (!hasContent) return renderEmptyState();

    return (
      <Stack spacing={1}>
        {/* Search */}
        <InputBase
          placeholder="搜索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            px: 1.5, py: 0.8, borderRadius: 2,
            bgcolor: 'action.hover', fontSize: 14,
          }}
          startAdornment={<Typography sx={{ mr: 1, color: 'text.secondary', fontSize: 14 }}>🔍</Typography>}
        />

        {!hasResults && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            没有找到相关内容
          </Typography>
        )}

        {/* Recent events */}
        {filteredEvents.length > 0 && (
          <>
            <SectionLabel label="最近参加的活动" />
            <List disablePadding dense>
              {filteredEvents.map((evt, i) => (
                <ListItemButton key={i} onClick={() => handleSelect(evt)} sx={{ borderRadius: 2, py: 0.6 }}>
                  <ListItemIcon sx={{ minWidth: 32, fontSize: 16 }}>📅</ListItemIcon>
                  <ListItemText
                    primary={evt.title}
                    secondary={evt.subtitle}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {/* Recent people */}
        {filteredPeople.length > 0 && (
          <>
            <SectionLabel label="最近遇到的人" />
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ px: 0.5 }}>
              {filteredPeople.map((p) => (
                <Stack
                  key={p.name}
                  alignItems="center"
                  spacing={0.3}
                  onClick={() => handleSelectMember(p.name, p.ctx)}
                  sx={{
                    cursor: 'pointer', p: 0.8, borderRadius: 2, minWidth: 56,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Ava name={p.name} size={32} />
                  <Typography fontSize={11} fontWeight={600}>{p.name}</Typography>
                </Stack>
              ))}
            </Stack>
          </>
        )}

        {/* Movies */}
        {filteredMovies.length > 0 && (
          <>
            <SectionLabel label="电影" />
            <List disablePadding dense>
              {filteredMovies.map((m, i) => (
                <ListItemButton key={i} onClick={() => handleSelect(m)} sx={{ borderRadius: 2, py: 0.6 }}>
                  <ListItemIcon sx={{ minWidth: 32, fontSize: 16 }}>🎬</ListItemIcon>
                  <ListItemText
                    primary={m.title}
                    secondary={m.subtitle}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}

        {/* Books */}
        {filteredBooks.length > 0 && (
          <>
            <SectionLabel label="书" />
            <List disablePadding dense>
              {filteredBooks.map((b, i) => (
                <ListItemButton key={i} onClick={() => handleSelect(b)} sx={{ borderRadius: 2, py: 0.6 }}>
                  <ListItemIcon sx={{ minWidth: 32, fontSize: 16 }}>📖</ListItemIcon>
                  <ListItemText
                    primary={b.title}
                    secondary={b.subtitle}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Stack>
    );
  }

  /* ─── Step 2: Action selection ─── */
  function renderActionsStep() {
    if (!selected) return null;
    const actions = actionsFor(selected);

    return (
      <List disablePadding>
        {actions.map((a) => (
          <ListItemButton
            key={a.key}
            onClick={() => handleAction(a.key)}
            sx={{ borderRadius: 2, mb: 0.5, border: '1px solid', borderColor: 'divider' }}
          >
            <ListItemIcon sx={{ minWidth: 36, fontSize: 18 }}>{a.icon}</ListItemIcon>
            <ListItemText
              primary={a.label}
              secondary={a.desc}
              primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
              secondaryTypographyProps={{ fontSize: 12 }}
            />
          </ListItemButton>
        ))}
      </List>
    );
  }

  /* ─── Step 3a: Inline comment ─── */
  function renderCommentStep() {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          对「{selected?.title}」说点什么
        </Typography>
        <TextField
          multiline
          minRows={4}
          maxRows={10}
          placeholder="写点什么..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          autoFocus
          fullWidth
          variant="outlined"
        />
        <Stack direction="row" justifyContent="flex-end">
          <IconButton
            onClick={handleCommentSend}
            disabled={!commentText.trim()}
            color="primary"
            size="small"
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    );
  }

  /* ─── Title based on step ─── */
  function dialogTitle() {
    if (step === 'select') return '想做什么？';
    if (step === 'comment') return `💬 写评论`;
    if (step === 'photo') return `📷 上传照片`;
    if (selected) return `${selected.icon} ${selected.title}`;
    return '';
  }

  const showBack = step !== 'select';

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 5, pb: 1 }}>
          {showBack && (
            <IconButton
              size="small"
              onClick={() => {
                if (step === 'comment' || step === 'photo') {
                  setStep('actions');
                  setCommentText('');
                } else {
                  reset();
                }
              }}
              sx={{ mr: 0.5 }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Typography variant="h6" component="span" sx={{ fontSize: 16, fontWeight: 700, flex: 1 }}>
            {dialogTitle()}
          </Typography>
          <IconButton onClick={handleClose} size="small" sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 0, pb: 2 }}>
          {step === 'select' && renderSelectStep()}
          {step === 'actions' && renderActionsStep()}
          {step === 'comment' && renderCommentStep()}
          {step === 'photo' && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              请选择要上传的照片...
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for photo upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFileChange}
      />

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2000}
        onClose={() => setSnack('')}
        message={snack}
      />
    </>
  );
}

/* ─── Helper: section label ─── */
function SectionLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="overline"
      sx={{ fontSize: 11, color: 'text.secondary', px: 0.5, pt: 0.5, letterSpacing: 1 }}
    >
      {label}
    </Typography>
  );
}
