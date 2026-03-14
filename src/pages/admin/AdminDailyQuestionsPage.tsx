import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  fetchDailyQuestions,
  createDailyQuestion,
  updateDailyQuestion,
  deleteDailyQuestion,
  type DailyQuestionRow,
} from '@/lib/domainApi';

const TARGET_TYPES = [
  { value: 'recommendation', label: '推荐' },
  { value: 'proposal', label: '提案' },
  { value: 'comment', label: '评论' },
];

const TARGET_CATEGORIES = [
  { value: '', label: '(无)' },
  { value: 'music', label: '音乐' },
  { value: 'place', label: '地点' },
  { value: 'movie', label: '电影' },
  { value: 'book', label: '图书' },
  { value: 'recipe', label: '菜谱' },
  { value: 'external_event', label: '演出/展览' },
];

const TARGET_ENTITY_TYPES = [
  { value: '', label: '(无)' },
  { value: 'event', label: '活动' },
  { value: 'recommendation', label: '推荐' },
];

const typeLabelMap: Record<string, string> = { recommendation: '推荐', proposal: '提案', comment: '评论' };
const catLabelMap: Record<string, string> = { music: '音乐', place: '地点', movie: '电影', book: '图书', recipe: '菜谱', external_event: '演出/展览' };
const entityLabelMap: Record<string, string> = { event: '活动', recommendation: '推荐' };

function typeChip(q: DailyQuestionRow) {
  const label = typeLabelMap[q.targetType] ?? q.targetType;
  const cat = q.targetCategory ? catLabelMap[q.targetCategory] ?? q.targetCategory : '';
  const entity = q.targetEntityType ? entityLabelMap[q.targetEntityType] ?? q.targetEntityType : '';
  const sub = cat || entity;
  return sub ? `${label}/${sub}` : label;
}

export default function AdminDailyQuestionsPage() {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<DailyQuestionRow[]>([]);
  const [filter, setFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DailyQuestionRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DailyQuestionRow | null>(null);

  // Form state (shared by create + edit)
  const [formText, setFormText] = useState('');
  const [formType, setFormType] = useState('recommendation');
  const [formCategory, setFormCategory] = useState('');
  const [formEntityType, setFormEntityType] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      setQuestions(await fetchDailyQuestions());
    } catch (e) { console.error('Failed to load daily questions', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const resetForm = () => { setFormText(''); setFormType('recommendation'); setFormCategory(''); setFormEntityType(''); };

  const openCreate = () => { resetForm(); setCreateOpen(true); };

  const openEdit = (q: DailyQuestionRow) => {
    setEditTarget(q);
    setFormText(q.text);
    setFormType(q.targetType);
    setFormCategory(q.targetCategory ?? '');
    setFormEntityType(q.targetEntityType ?? '');
  };

  const handleCreate = async () => {
    if (!formText.trim() || !formType) return;
    try {
      await createDailyQuestion({
        text: formText.trim(),
        targetType: formType,
        ...(formType === 'recommendation' && formCategory ? { targetCategory: formCategory } : {}),
        ...(formType === 'comment' && formEntityType ? { targetEntityType: formEntityType } : {}),
      });
      setCreateOpen(false);
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleEdit = async () => {
    if (!editTarget || !formText.trim()) return;
    try {
      await updateDailyQuestion(editTarget.id, {
        text: formText.trim(),
        targetType: formType,
        targetCategory: formType === 'recommendation' && formCategory ? formCategory : null,
        targetEntityType: formType === 'comment' && formEntityType ? formEntityType : null,
      });
      setEditTarget(null);
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteDailyQuestion(confirmDelete.id); setConfirmDelete(null); loadData(); }
    catch (e) { console.error(e); }
  };

  // Build filter options from data
  const filterOptions = Array.from(new Set(questions.map(typeChip))).sort();
  const filtered = filter ? questions.filter(q => typeChip(q) === filter) : questions;

  if (loading) return <Typography>加载中...</Typography>;

  const formDialog = (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField label="问题文本" size="small" fullWidth multiline minRows={2} value={formText} onChange={e => setFormText(e.target.value)} />
      <TextField label="目标类型" size="small" select fullWidth value={formType} onChange={e => { setFormType(e.target.value); setFormCategory(''); setFormEntityType(''); }}>
        {TARGET_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
      </TextField>
      {formType === 'recommendation' && (
        <TextField label="推荐分类" size="small" select fullWidth value={formCategory} onChange={e => setFormCategory(e.target.value)}>
          {TARGET_CATEGORIES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
      )}
      {formType === 'comment' && (
        <TextField label="评论对象类型" size="small" select fullWidth value={formEntityType} onChange={e => setFormEntityType(e.target.value)}>
          {TARGET_ENTITY_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
      )}
    </Stack>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" color="text.secondary">
            共 {questions.length} 道题
          </Typography>
          <Chip
            label="全部"
            size="small"
            color={!filter ? 'primary' : 'default'}
            onClick={() => setFilter('')}
          />
          {filterOptions.map(f => (
            <Chip
              key={f}
              label={`${f} (${questions.filter(q => typeChip(q) === f).length})`}
              size="small"
              color={filter === f ? 'primary' : 'default'}
              onClick={() => setFilter(filter === f ? '' : f)}
            />
          ))}
        </Stack>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
          新增问题
        </Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {/* Header */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 80px', md: '120px 1fr 80px' },
            gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover',
          }}>
            <Typography variant="caption" fontWeight={700} sx={{ display: { xs: 'none', md: 'block' } }}>类型</Typography>
            <Typography variant="caption" fontWeight={700}>问题</Typography>
            <Typography variant="caption" fontWeight={700}>操作</Typography>
          </Box>
          <Divider />

          {filtered.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无问题
            </Typography>
          )}

          {filtered.map((q, i) => (
            <Box key={q.id}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 80px', md: '120px 1fr 80px' },
                gap: 1, px: 2, py: 1.5, alignItems: 'center',
              }}>
                <Chip label={typeChip(q)} size="small" variant="outlined" sx={{ display: { xs: 'none', md: 'flex' }, justifySelf: 'start' }} />
                <Box>
                  <Typography variant="body2">{q.text}</Typography>
                  <Chip label={typeChip(q)} size="small" variant="outlined" sx={{ display: { xs: 'flex', md: 'none' }, mt: 0.5, width: 'fit-content' }} />
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => openEdit(q)}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setConfirmDelete(q)}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
              {i < filtered.length - 1 && <Divider />}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增每日问题</DialogTitle>
        <DialogContent>{formDialog}</DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formText.trim()}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑问题</DialogTitle>
        <DialogContent>{formDialog}</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>取消</Button>
          <Button variant="contained" onClick={handleEdit} disabled={!formText.trim()}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="确认删除"
        message={`确定要删除「${confirmDelete?.text ?? ''}」吗？`}
        confirmLabel="删除"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Stack>
  );
}
