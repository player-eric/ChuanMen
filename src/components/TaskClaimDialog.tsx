import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { firstNonEmoji } from '@/components/Atoms';
import type { EventTaskData } from '@/types';

interface TaskClaimDialogProps {
  open: boolean;
  onClose: () => void;
  tasks: EventTaskData[];
  onClaim: (taskId: string) => Promise<void>;
  onVolunteer: (role: string, description?: string) => Promise<void>;
}

export default function TaskClaimDialog({
  open,
  onClose,
  tasks,
  onClaim,
  onVolunteer,
}: TaskClaimDialogProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | ''>('');
  const [volunteerRole, setVolunteerRole] = useState('');
  const [loading, setLoading] = useState(false);

  const unclaimedTasks = tasks.filter((t) => !t.claimedById);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (selectedTaskId) {
        await onClaim(selectedTaskId);
      } else if (volunteerRole.trim()) {
        await onVolunteer(volunteerRole.trim());
      }
    } finally {
      setLoading(false);
      setSelectedTaskId('');
      setVolunteerRole('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedTaskId('');
    setVolunteerRole('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        报名成功！🎉
      </DialogTitle>
      <DialogContent>
        {unclaimedTasks.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              这次活动还需要帮手，要认领一个吗？
            </Typography>
            <RadioGroup
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                setVolunteerRole('');
              }}
            >
              {unclaimedTasks.map((task) => {
                // Count claimed tasks with same role
                const sameRoleTasks = tasks.filter((t) => t.role === task.role);
                const claimedCount = sameRoleTasks.filter((t) => t.claimedById).length;
                const claimedNames = sameRoleTasks
                  .filter((t) => t.claimedBy)
                  .map((t) => t.claimedBy!.name);

                return (
                  <FormControlLabel
                    key={task.id}
                    value={task.id}
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {task.role}
                          </Typography>
                          {claimedCount > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              已认领：{claimedNames.join('、')}
                            </Typography>
                          )}
                        </Stack>
                        {task.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {task.description}
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', my: 0.5 }}
                  />
                );
              })}
            </RadioGroup>
          </>
        )}

        <Divider sx={{ my: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {unclaimedTasks.length > 0 ? '或者' : '想帮忙？'}
          </Typography>
        </Divider>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          我还能帮忙：
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="例如：准备背景音乐"
          value={volunteerRole}
          onChange={(e) => {
            setVolunteerRole(e.target.value);
            setSelectedTaskId('');
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>下次再说</Button>
        <Button
          variant="contained"
          disabled={loading || (!selectedTaskId && !volunteerRole.trim())}
          onClick={handleSubmit}
        >
          {selectedTaskId ? '认领' : '自荐'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
