import { useMemo, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { Card, CardActionArea, CardContent, Grid, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { PastEvent } from '@/types';

export default function EventRecordsPage() {
  const records = useLoaderData() as PastEvent[];
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return records;
    return records.filter((record) => {
      const searchable = `${record.title} ${record.host} ${record.film ?? ''}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [keyword, records]);

  return (
    <Stack spacing={2}>
      <TextField
        placeholder="搜索活动记录"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Grid container spacing={2}>
        {filtered.map((record, idx) => (
          <Grid key={record.id ?? idx} size={{ xs: 12, md: 6 }}>
            <Card>
              {record.id ? (
                <CardActionArea onClick={() => navigate(`/events/${record.id}`)}>
                  <CardContent>
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={700}>{record.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{record.date} · {record.host} Host · {record.people} 人</Typography>
                      {record.film && (
                        <Typography variant="caption" color="text.secondary">🎬 放映：{record.film}</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              ) : (
                <CardContent>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" fontWeight={700}>{record.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{record.date} · {record.host} Host · {record.people} 人</Typography>
                    {record.film && (
                      <Typography variant="caption" color="text.secondary">🎬 放映：{record.film}</Typography>
                    )}
                  </Stack>
                </CardContent>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && <Typography color="text.secondary">没有匹配的活动记录</Typography>}
    </Stack>
  );
}
