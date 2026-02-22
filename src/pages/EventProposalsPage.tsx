import { useLoaderData } from 'react-router';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type { Proposal } from '@/types';

export default function EventProposalsPage() {
  const proposals = useLoaderData() as Proposal[];

  return (
    <Stack spacing={2}>
      {proposals.map((proposal, idx) => (
        <Card key={idx}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700}>{proposal.title}</Typography>
            <Typography variant="caption" color="text.secondary">{proposal.name} · {proposal.time}</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">{proposal.interested.length} 人感兴趣</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined">🙋 感兴趣 {proposal.votes}</Button>
                <Button size="small" variant="contained">🏠 我来组织</Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
