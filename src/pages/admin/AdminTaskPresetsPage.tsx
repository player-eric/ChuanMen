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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  fetchTaskPresets,
  createTaskPreset,
  updateTaskPreset,
  deleteTaskPreset,
  type TaskPresetRow,
} from '@/lib/domainApi';

export default function AdminTaskPresetsPage() {
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState<TaskPresetRow[]>([]);
  const [editTarget, setEditTarget] = useState<TaskPresetRow | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>(['']);
  const [confirmDelete, setConfirmDelete] = useState<TaskPresetRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTaskPresets();
      setPresets(data);
    } catch (e) { console.error('Failed to load task presets', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openEdit = (p: TaskPresetRow) => {
    setEditTarget(p);
    setEditRoles([...p.roles]);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const cleaned = editRoles.filter(r => r.trim());
    if (cleaned.length === 0) {
      // No roles left → delete the preset
      try { await deleteTaskPreset(editTarget.id); } catch (e) { console.error(e); }
    } else {
      try { await updateTaskPreset(editTarget.id, { roles: cleaned }); } catch (e) { console.error(e); }
    }
    setEditTarget(null); loadData();
  };

  const handleCreate = async () => {
    const tag = newTag.trim();
    const roles = newRoles.filter(r => r.trim());
    if (!tag || roles.length === 0) return;
    try {
      await createTaskPreset({ tag, roles });
      setCreateOpen(false); setNewTag(''); setNewRoles(['']); loadData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try { await deleteTaskPreset(confirmDelete.id); setConfirmDelete(null); loadData(); }
    catch (e) { console.error(e); }
  };

  if (loading) return <Typography>加载中…</Typography>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          按活动类型配置默认分工项，Host 创建活动时自动填入
        </Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setCreateOpen(true); setNewTag(''); setNewRoles(['']); }}>
          新增 Tag
        </Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {/* Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px', gap: 1, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
            <Typography variant="caption" fontWeight={700}>活动类型</Typography>
            <Typography variant="caption" fontWeight={700}>预设分工</Typography>
            <Typography variant="caption" fontWeight={700}>操作</Typography>
          </Box>
          <Divider />

          {presets.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              暂无预设，点击"新增 Tag"添加
            </Typography>
          )}

          {presets.map((p, i) => (
            <Box key={p.id}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr 100px', gap: 1, px: 2, py: 1.5, alignItems: 'center' }}>
                <Typography variant="body2" fontWeight={600}>{p.tag}</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {p.roles.map(role => (
                    <Chip key={role} label={role} size="small" variant="outlined" />
                  ))}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => openEdit(p)}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setConfirmDelete(p)}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
              {i < presets.length - 1 && <Divider />}
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑「{editTarget?.tag}」的预设分工</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {editRoles.map((role, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField size="small" fullWidth placeholder="分工名称" value={role} onChange={e => { const next = [...editRoles]; next[idx] = e.target.value; setEditRoles(next); }} />
                <IconButton size="small" onClick={() => setEditRoles(prev => prev.filter((_, i) => i !== idx))}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setEditRoles(prev => [...prev, ''])}>
              添加分工项
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>取消</Button>
          <Button variant="contained" onClick={handleSaveEdit}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增 Tag 预设</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="活动类型（Tag）" size="small" fullWidth value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="如：读书会、桌游..." />
            <Typography variant="body2" fontWeight={600}>预设分工项</Typography>
            {newRoles.map((role, idx) => (
              <Stack key={idx} direction="row" spacing={1} alignItems="center">
                <TextField size="small" fullWidth placeholder="分工名称" value={role} onChange={e => { const next = [...newRoles]; next[idx] = e.target.value; setNewRoles(next); }} />
                {newRoles.length > 1 && (
                  <IconButton size="small" onClick={() => setNewRoles(prev => prev.filter((_, i) => i !== idx))}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            ))}
            <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setNewRoles(prev => [...prev, ''])}>
              添加分工项
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!newTag.trim() || newRoles.every(r => !r.trim())}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="确认删除"
        message={`确定要删除「${confirmDelete?.tag ?? ''}」的预设分工吗？已创建的活动不受影响。`}
        confirmLabel="删除"
        confirmColor="error"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Stack>
  );
}
