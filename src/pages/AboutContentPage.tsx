import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import { marked } from 'marked';
import { fetchAboutContentApi } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';

/* ── Mesh-gradient banner per content type ── */
const bannerConfig: Record<string, { base: string; glows: string[] }> = {
  principle: {
    base: '#1e1610',
    glows: [
      'radial-gradient(ellipse at 25% 35%, rgba(212,165,116,0.4) 0%, transparent 60%)',
      'radial-gradient(ellipse at 75% 65%, rgba(200,140,80,0.25) 0%, transparent 55%)',
      'radial-gradient(ellipse at 55% 15%, rgba(232,200,160,0.15) 0%, transparent 50%)',
    ],
  },
  host_guide: {
    base: '#101a14',
    glows: [
      'radial-gradient(ellipse at 30% 45%, rgba(107,203,119,0.3) 0%, transparent 55%)',
      'radial-gradient(ellipse at 70% 35%, rgba(140,200,160,0.22) 0%, transparent 50%)',
      'radial-gradient(ellipse at 45% 80%, rgba(212,165,116,0.15) 0%, transparent 50%)',
    ],
  },
  about: {
    base: '#14101e',
    glows: [
      'radial-gradient(ellipse at 30% 35%, rgba(130,110,210,0.35) 0%, transparent 55%)',
      'radial-gradient(ellipse at 72% 60%, rgba(91,141,239,0.25) 0%, transparent 50%)',
      'radial-gradient(ellipse at 50% 15%, rgba(180,160,220,0.15) 0%, transparent 50%)',
    ],
  },
  letter: {
    base: '#1a1410',
    glows: [
      'radial-gradient(ellipse at 35% 40%, rgba(210,150,110,0.35) 0%, transparent 55%)',
      'radial-gradient(ellipse at 68% 60%, rgba(212,165,116,0.25) 0%, transparent 50%)',
      'radial-gradient(ellipse at 50% 15%, rgba(230,190,150,0.15) 0%, transparent 50%)',
    ],
  },
  legal: {
    base: '#10141a',
    glows: [
      'radial-gradient(ellipse at 30% 45%, rgba(100,145,190,0.3) 0%, transparent 55%)',
      'radial-gradient(ellipse at 72% 38%, rgba(80,125,175,0.22) 0%, transparent 50%)',
      'radial-gradient(ellipse at 50% 80%, rgba(130,160,200,0.12) 0%, transparent 50%)',
    ],
  },
};

const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

/**
 * Fix broken Notion-imported content: a single <p> wrapping flattened markdown
 * where newlines became spaces. Restore line breaks so marked can parse it.
 */
function normalizeContent(raw: string): string {
  const m = raw.match(/^<p>([\s\S]+)<\/p>\s*$/);
  if (!m || !/#{2,}\s/.test(m[1])) return raw;
  return m[1]
    .replace(/ (---) /g, '\n\n$1\n\n')
    .replace(/ (#{2,6} )/g, '\n\n$1')
    .replace(/ (- )/g, '\n$1');
}

export default function AboutContentPage() {
  const { contentType } = useParams();
  const [apiData, setApiData] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentType) { setLoading(false); return; }
    fetchAboutContentApi(contentType)
      .then((res: any) => {
        const data = Array.isArray(res) ? res[0] : res;
        if (data?.content) {
          setApiData({ title: data.title ?? contentType, content: data.content });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contentType]);

  const result = useMemo(() => {
    if (!contentType || !apiData) return null;
    return { title: apiData.title, html: marked.parse(normalizeContent(apiData.content)) as string };
  }, [contentType, apiData]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (!result) {
    return <Typography color="text.secondary">未找到对应内容</Typography>;
  }

  const banner = contentType ? bannerConfig[contentType] : undefined;

  return (
    <Card>
      {banner && (
        <Box
          sx={{
            position: 'relative',
            height: 80,
            overflow: 'hidden',
            borderRadius: 'inherit',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            background: `${banner.glows.join(',')}, ${banner.base}`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              mixBlendMode: 'screen',
              backgroundImage: grainSvg,
              backgroundSize: '128px 128px',
            }}
          />
        </Box>
      )}
      <CardContent>
        <RichTextViewer html={result.html} />
      </CardContent>
    </Card>
  );
}
