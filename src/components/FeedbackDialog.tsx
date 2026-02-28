import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { submitFeedback } from '@/lib/domainApi';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill name (e.g. from logged-in user) */
  defaultName?: string;
  /** Pre-fill email */
  defaultEmail?: string;
  /** Which page triggered this dialog */
  page?: string;
}

export function FeedbackDialog({ open, onClose, defaultName = '', defaultEmail = '', page }: FeedbackDialogProps) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await submitFeedback({
        name: name.trim(),
        email: email.trim() || undefined,
        message: message.trim(),
        page,
      });
      setSent(true);
    } catch {
      setError('发送失败，请稍后再试');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after close animation
    setTimeout(() => {
      setSent(false);
      setError(null);
      setMessage('');
    }, 300);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>联系管理员</DialogTitle>
      <DialogContent>
        {sent ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            感谢你的反馈！管理员会尽快查看。
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="你的名字"
              size="small"
              fullWidth
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Email（可选）"
              size="small"
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="方便管理员回复你"
            />
            <TextField
              label="你想说的话"
              size="small"
              fullWidth
              required
              multiline
              minRows={3}
              maxRows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="有任何问题、建议或反馈，都可以在这里告诉我们..."
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {sent ? (
          <Button onClick={handleClose}>关闭</Button>
        ) : (
          <>
            <Button onClick={handleClose}>取消</Button>
            <Button
              variant="contained"
              startIcon={<SendRoundedIcon />}
              onClick={handleSubmit}
              disabled={sending || !name.trim() || !message.trim()}
            >
              {sending ? '发送中...' : '发送'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
