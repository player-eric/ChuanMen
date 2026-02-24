import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { fetchAboutContentApi } from '@/lib/domainApi';

/** Static fallback for content types not in DB */
const staticContent: Record<string, { title: string; body: string[] }> = {
  legal: {
    title: '免责声明与隐私政策',
    body: [
      '【免责声明】',
      '串门儿（ChuanMen）是非营利性社区活动组织平台，旨在促进社区成员之间的社交联系。本平台不提供任何商业服务，不收取活动参与费用（AA 制费用由参与者之间自行协商）。',
      '活动安全：所有线下活动均由成员自愿发起和参加。串门儿不对活动过程中发生的人身伤害、财产损失或任何意外事件承担责任。参与者应自行评估活动风险并对自身安全负责。',
      'Host 责任：活动 Host 自愿提供场地和组织服务，串门儿不对 Host 的场地条件、食品安全或其他 Host 行为承担任何责任。',
      '第三方内容：用户在平台上发布的内容（包括电影推荐、活动描述、感谢卡等）仅代表个人观点，不代表串门儿的立场。',
      '【隐私政策】',
      '信息收集：我们收集您注册时提供的基本信息（姓名、邮箱、位置）以及您在平台上的活动记录（参加活动、推荐电影、发送感谢卡等）。',
      '信息使用：您的信息仅用于平台功能运行、活动组织和社区互动。我们不会将您的个人信息出售或分享给任何第三方用于商业目的。',
      '信息展示：您的姓名、位置、Bio 等个人资料对社区成员可见。您可以在设置中选择隐藏邮箱地址。感谢卡可设置为"仅彼此可见"。',
      '数据存储：您的数据存储在安全的服务器上。我们采取合理的技术措施保护您的个人信息安全。',
      '账号注销：您可以随时联系运营团队申请注销账号和删除个人数据。',
      '【联系我们】',
      '如有任何问题或疑虑，请联系串门儿运营团队：cm@gmail.com',
      '本声明最后更新日期：2026 年 2 月。',
    ],
  },
};

export default function AboutContentPage() {
  const { contentType } = useParams();
  const [apiContent, setApiContent] = useState<{ title: string; body: string[] } | null>(null);

  useEffect(() => {
    if (!contentType || staticContent[contentType]) return;
    fetchAboutContentApi(contentType)
      .then((data: any) => {
        if (data) {
          const body = (data.contentMd ?? '').split('\n').filter((l: string) => l.trim());
          setApiContent({ title: data.title ?? contentType, body });
        }
      })
      .catch(() => {});
  }, [contentType]);

  const content = useMemo(() => {
    if (!contentType) return null;
    return staticContent[contentType] ?? apiContent;
  }, [contentType, apiContent]);

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
