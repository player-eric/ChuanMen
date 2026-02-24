import { useState, Suspense, lazy } from 'react';
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

/* ── PRD 11.1.10 ── 社群信息编辑：串门原则 / Host 指南 / 关于串门儿 / 串门来信 ── */

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
const RichTextViewer = lazy(() => import('@/components/RichTextEditor').then(m => ({ default: m.RichTextViewer })));

interface ContentBlock {
  id: string;
  label: string;
  type: 'principle' | 'host_guide' | 'letter' | 'about';
  content: string;
  updatedAt: string;
}

const initialContent: ContentBlock[] = [
  {
    id: 'principle',
    label: '串门原则',
    type: 'principle',
    content: `<h2>串门原则</h2>
<p>串门儿是一个重建真实联结的社群。以下原则是我们共同的基础：</p>
<ol>
<li><strong>真诚是前提</strong> — 礼貌但真诚的表达和沟通</li>
<li><strong>对 Host 礼貌</strong> — 准时到达、遵守 house rules、帮忙收拾</li>
<li><strong>不推销、不越界</strong> — 不推销产品、不主动交换商业资源</li>
<li><strong>取消政策</strong> — 活动开始前 24 小时内取消视为放鸽子，连续 2 次将限制报名</li>
<li><strong>隐私保护</strong> — 不在社群外传播他人个人信息、活动照片需经当事人同意</li>
</ol>`,
    updatedAt: '2026-02-10',
  },
  {
    id: 'host_guide',
    label: 'Host 手册',
    type: 'host_guide',
    content: `<h2>如何在家里办一场串门</h2>
<p>你不需要一个完美的房子，不需要准备一桌大餐，也不需要策划一个精彩的节目。你只需要打开门，说一句"来吧"。</p>
<h3>准备清单</h3>
<ul>
<li>确定日期和时间（工作日晚/周末下午都可以）</li>
<li>设定人数上限（建议 4-8 人，保持亲密感）</li>
<li>写你的 House Rules（换鞋、宠物、停车等）</li>
<li>准备基本饮品（水、茶即可，Potluck 可以让大家带）</li>
</ul>
<h3>活动当天</h3>
<ul>
<li>提前 30 分钟准备好环境</li>
<li>在 app 上更新活动状态</li>
<li>享受和朋友们在一起的时光 ✨</li>
</ul>`,
    updatedAt: '2026-01-25',
  },
  {
    id: 'letter',
    label: '串门来信',
    type: 'letter',
    content: `<h2>写给还没来串门的你</h2>
<p>如果你正在看这篇文字，说明你至少对"交一些真正的朋友"这件事有一点点好奇。</p>
<p>串门儿不是一个活动平台。我们不追求参与人数、不设 KPI、不搞积分排名。</p>
<p>我们做的事情很简单：一群人轮流打开自己的家门，一起做一些小事——看电影、做饭、散步、聊天。</p>
<p>听起来平淡，但这些平淡的事情，做着做着就变成了认识一个人的开始。</p>`,
    updatedAt: '2026-01-15',
  },
  {
    id: 'about',
    label: '关于串门儿',
    type: 'about',
    content: `<h2>串门儿是怎么开始的</h2>
<p>2024 年秋天，几个在纽约的朋友觉得："为什么搬来美国之后，交新朋友变得这么难？"</p>
<p>不是没有社交活动，而是大部分活动都太浅了。去了一次酒吧，晃了一圈，加了个微信，然后再也没联系过。</p>
<p>串门儿的想法很简单——与其去一百个浅交的场合，不如在一个人的客厅里坐下来，好好聊一晚上。</p>
<p>从三个人在 Yuan 家看了一部电影，到现在每个月有十几场不同主题的活动。串门儿不是一家公司，是一群人选择用这种方式交朋友。</p>`,
    updatedAt: '2026-01-10',
  },
];

export default function AdminCommunityInfoPage() {
  const [tab, setTab] = useState(0);
  const [contents, setContents] = useState<ContentBlock[]>(initialContent);
  const [editing, setEditing] = useState<string | null>(null);
  const [editHtml, setEditHtml] = useState('');

  const current = contents[tab];

  const startEdit = () => {
    setEditing(current.id);
    setEditHtml(current.content);
  };

  const saveEdit = () => {
    setContents(prev =>
      prev.map(c =>
        c.id === editing
          ? { ...c, content: editHtml, updatedAt: new Date().toISOString().slice(0, 10) }
          : c,
      ),
    );
    setEditing(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditHtml('');
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>社群信息编辑</Typography>
      <Typography variant="body2" color="text.secondary">
        编辑串门原则、Host 手册、串门来信、关于页等公共内容。修改后即时生效，支持 Markdown 快捷输入。
      </Typography>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setEditing(null); }}>
        {contents.map(c => (
          <Tab key={c.id} label={c.label} />
        ))}
      </Tabs>

      <Card sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>{current.label}</Typography>
            <Chip size="small" label={`最后更新: ${current.updatedAt}`} variant="outlined" />
          </Stack>
          {editing !== current.id ? (
            <Button startIcon={<EditRoundedIcon />} onClick={startEdit}>编辑</Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button onClick={cancelEdit}>取消</Button>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={saveEdit}>保存</Button>
            </Stack>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {editing === current.id ? (
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
