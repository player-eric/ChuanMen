import { useLoaderData } from 'react-router';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import type { PastEvent } from '@/types';

export default function EventRecordsPage() {
  const records = useLoaderData() as PastEvent[];

  return (
    <Grid container spacing={2}>
      {records.map((record, idx) => (
        <Grid key={idx} size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Stack spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={700}>{record.title}</Typography>
                <Typography variant="body2" color="text.secondary">{record.date} · {record.host} Host · {record.people} 人</Typography>
                {record.film && (
                  <Typography variant="caption" color="text.secondary">🎬 放映：{record.film}</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
