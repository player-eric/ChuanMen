import { useMemo } from 'react';
import { useParams } from 'react-router';
import { Card, CardContent, Stack, Typography } from '@mui/material';

const contentMap: Record<string, { title: string; body: string[] }> = {
  principle: {
    title: '串门原则',
    body: [
      '关系优先于活动：活动是手段，关系是目的。',
      '个性化引导降低参与成本：在合适时机轻推一把。',
      '轻输入，重整理：成员轻表达，系统做结构化。',
      '让参与可见：每一次投票、Host、报名都被看见。',
      '每条内容都是参与入口：看到就能行动。',
      '共创而非分发：内容来自成员贡献。',
    ],
  },
  host_guide: {
    title: 'Host 手册',
    body: [
      '建议活动人数不超过 10 人，优先保障交流质量。',
      '先邀请核心参与者，再在公开阶段开放剩余名额。',
      '请提前写清楚 house rules，帮助大家建立预期。',
      '活动后鼓励参与者留下照片、留言与感谢卡。',
    ],
  },
  letter: {
    title: '串门来信',
    body: [
      '我们希望把陌生人变成邻居，把邻居变成朋友。',
      '如果你刚加入，不用急着表现，先来一次活动感受气氛。',
      '欢迎带着好奇心来，也欢迎把温暖留下。',
    ],
  },
  about: {
    title: '关于我们',
    body: [
      '串门儿从几个人在客厅看电影开始。',
      '后来有人带来朋友、有人开始做 Host、有人记录下大家的故事。',
      '网页端的目标是把这些关系和贡献，清楚地展示出来。',
    ],
  },
};

export default function AboutContentPage() {
  const { contentType } = useParams();

  const content = useMemo(() => {
    if (!contentType) return null;
    return contentMap[contentType] ?? null;
  }, [contentType]);

  if (!content) {
    return <Typography color="text.secondary">未找到对应内容</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h5" fontWeight={700}>{content.title}</Typography>
          {content.body.map((paragraph) => (
            <Typography key={paragraph} variant="body2" color="text.secondary">
              {paragraph}
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
