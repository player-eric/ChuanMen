import { useEffect, useState, Suspense, lazy } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { fetchAllAboutContentApi, upsertAboutContent } from '@/lib/domainApi';

/* ── PRD 11.1.10 ── 社群信息编辑：串门原则 / Host 指南 / 关于串门儿 / 串门来信 ── */

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
const RichTextViewer = lazy(() => import('@/components/RichTextEditor').then(m => ({ default: m.RichTextViewer })));

type Row = Record<string, any>;

const typeLabels: Record<string, string> = {
  principle: '串门原则',
  host_guide: 'Host 手册',
  letter: '串门来信',
  about: '关于串门儿',
};

/* fallback content shown while real data loads or when DB is empty */
const fallbackContent: { type: string; label: string; content: string }[] = [
  { type: 'principle', label: '串门原则', content: '<p>串门原则内容尚未配置</p>' },
  { type: 'host_guide', label: 'Host 手册', content: '<p>Host 手册内容尚未配置</p>' },
  { type: 'letter', label: '串门来信', content: '<p>串门来信内容尚未配置</p>' },
  { type: 'about', label: '关于串门儿', content: '<p>关于串门儿内容尚未配置</p>' },
];

export default function AdminCommunityInfoPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<{ type: string; label: string; content: string; updatedAt: string }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editHtml, setEditHtml] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data: Row[] = await fetchAllAboutContentApi();
      const mapped = fallbackContent.map(fb => {
        const found = data.find(d => d.type === fb.type);
        return {
          type: fb.type,
          label: typeLabels[fb.type] ?? fb.type,
          content: found?.content ?? fb.content,
          updatedAt: found?.updatedAt ? new Date(found.updatedAt).toISOString().slice(0, 10) : '—',
        };
      });
      setContents(mapped);
    } catch (e) {
      console.error('Failed to load content', e);
      setContents(fallbackContent.map(fb => ({ ...fb, updatedAt: '—' })));
    }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const current = contents[tab];

  const startEdit = () => {
    if (!current) return;
    setEditing(current.type);
    setEditHtml(current.content);
  };

  const saveEdit = async () => {
    if (!editing || !current) return;
    setSaving(true);
    try {
      await upsertAboutContent(editing, { title: current.label, content: editHtml });
      setEditing(null);
      loadData();
    } catch (e) { console.error('Save failed', e); }
    finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditHtml('');
  };

  if (loading || !current) return <Typography>加载中…</Typography>;

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>社群信息编辑</Typography>
      <Typography variant="body2" color="text.secondary">
        编辑串门原则、Host 手册、串门来信、关于页等公共内容。修改后即时生效，支持 Markdown 快捷输入。
      </Typography>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setEditing(null); }}>
        {contents.map(c => (
          <Tab key={c.type} label={c.label} />
        ))}
      </Tabs>

      <Card sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>{current.label}</Typography>
            <Chip size="small" label={`最后更新: ${current.updatedAt}`} variant="outlined" />
          </Stack>
          {editing !== current.type ? (
            <Button startIcon={<EditRoundedIcon />} onClick={startEdit}>编辑</Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button onClick={cancelEdit}>取消</Button>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveEdit} disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </Button>
            </Stack>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {editing === current.type ? (
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}>
            <Box sx={{ minHeight: 300 }}>
              <RichTextEditor content={editHtml} onChange={setEditHtml} />
            </Box>
          </Suspense>
        ) : (
          <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}>
            <Box sx={{ minHeight: 200 }}>
              <RichTextViewer html={current.content} />
            </Box>
          </Suspense>
        )}
      </Card>

      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} mb={1}>💡 提示</Typography>
        <Typography variant="body2" color="text.secondary">
          • 编辑器支持 Markdown 快捷输入（如 # 标题、- 列表、** 加粗）
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • 修改后即时生效，所有用户下次访问「关于串门儿」相关页面即会看到最新内容
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • 串门原则和 Host 手册的内容同时用于申请页面的引导文案
        </Typography>
      </Card>
    </Stack>
  );
}
