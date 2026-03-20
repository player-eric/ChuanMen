import { useLoaderData, useNavigate } from 'react-router';
import { Box, Button, Card, CardActionArea, CardContent, Grid, Stack, Typography } from '@mui/material';
import type { AboutPageData } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import MilestoneTimeline from '@/components/MilestoneTimeline';

export default function AboutPage() {
  const data = useLoaderData() as AboutPageData;
  const navigate = useNavigate();
  const { user } = useAuth();

  const items = [
    { icon: '👥', title: '成员', desc: `${data.memberCount} 位成员 · ${data.hostCount} 位 Host`, action: () => navigate('/members') },
    { icon: '📖', title: '串门原则', desc: '我们怎么定义这个社群', action: () => navigate('/about/principle') },
    { icon: '🏠', title: 'Host 手册', desc: '如何在家里办一场串门', action: () => navigate('/about/host_guide') },
    { icon: '✉', title: '串门来信', desc: '写给还没来串门的你', action: () => window.open('https://chengdaorange.substack.com/', '_blank') },
    { icon: '💬', title: '关于我们', desc: '串门儿是怎么开始的', action: () => navigate('/about/about') },
  ];

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={800}>串门儿</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            交个真正的朋友
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            我们通过小型聚会认识彼此——电影夜、Potluck、徒步、咖啡闲聊。每次不超过 10 个人，在谁的客厅、谁的厨房。来了就是朋友，走了还是朋友。
          </Typography>
          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            {[
              { n: data.memberCount, l: '成员' },
              { n: data.eventCount, l: '活动' },
              { n: data.months, l: '个月' },
            ].map((metric) => (
              <Grid key={metric.l} size={{ xs: 4 }}>
                <Typography variant="h5" color="primary.main" fontWeight={800}>{metric.n}</Typography>
                <Typography variant="caption" color="text.secondary">{metric.l}</Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={1.5}>
        {items.map((item) => (
          <Grid key={item.title} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardActionArea onClick={item.action} disabled={!item.action}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ fontSize: 24 }}>{item.icon}</Box>
                    <Box>
                      <Typography fontWeight={700}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>串门的信念</Typography>
          <Stack spacing={0.8}>
            {['对的人 > 更多人', '相互支持 > 社交隔绝', '客厅 > 写字楼', '真诚 > 客气'].map((value) => (
              <Typography key={value} variant="body2">• {value}</Typography>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {data.milestones?.length > 0 && (
        <Card>
          <CardContent>
            <MilestoneTimeline items={data.milestones} />
          </CardContent>
        </Card>
      )}

      {/* v2.1 §4.7: bottom CTA for non-logged-in users */}
      {!user && (
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate('/apply')}
          sx={{ py: 1.5, fontWeight: 700 }}
        >
          申请加入串门儿 →
        </Button>
      )}

      {/* Legal Disclaimer */}
      <Box sx={{ pt: 1, pb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', lineHeight: 1.8 }}>
          串门儿是非营利性社区活动组织，不提供任何商业服务。活动中的人身安全、财产损失由参与者自行负责。
          使用本平台即表示您同意我们的{' '}
          <Typography
            component="span"
            variant="caption"
            color="primary"
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/about/legal')}
          >
            免责声明与隐私政策
          </Typography>
          。
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
          © {new Date().getFullYear()} 串门儿 ChuanMen. All rights reserved.
        </Typography>
      </Box>
    </Stack>
  );
}
