import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';

/* ═══ Announcement content store ═══ */
interface AnnouncementContent {
  title: string;
  date: string;
  tag: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  cta?: { label: string; to: string };
}

const announcements: Record<string, AnnouncementContent> = {
  'spring-2025-recruit': {
    title: '🎉 串门 2025 春季招新开始啦！',
    date: '2025-02-15',
    tag: '招新',
    intro:
      '串门儿开放 2025 春季招新，欢迎推荐你身边有趣、真诚的朋友加入我们的社区。以下是本次招新的完整信息。',
    sections: [
      {
        heading: '📌 招新时间',
        body: [
          '推荐期：2025 年 2 月 15 日 – 3 月 15 日',
          '面谈期：3 月 16 日 – 3 月 31 日',
          '结果通知：4 月 5 日前',
        ],
      },
      {
        heading: '🙋 谁可以被推荐？',
        body: [
          '住在新泽西中部（Edison / New Brunswick / Princeton 半小时车程内）',
          '年龄 22–40 岁，对社区生活有兴趣',
          '真诚、不装、愿意参与线下活动',
          '至少能被一位现有成员推荐担保',
        ],
      },
      {
        heading: '📝 推荐流程',
        body: [
          '1. 推荐人填写「推荐表」，写明推荐理由、你们的关系、被推荐人的特点',
          '2. 被推荐人收到邀请链接后，填写「申请表」（自我介绍 + 参与意愿）',
          '3. 运营团队安排 1v1 线上或线下面谈（约 20 分钟）',
          '4. 运营讨论后通知结果；通过者可参加下一期新人活动',
        ],
      },
      {
        heading: '🎯 我们看重什么？',
        body: [
          '不是才艺、学历或工作背景，我们最看重：',
          '• 是否真诚 —— 不靠人设社交',
          '• 是否主动 —— 愿意参与和贡献',
          '• 是否尊重边界 —— 懂得 house rules、不给 Host 添麻烦',
        ],
      },
      {
        heading: '❓ 常见问题',
        body: [
          'Q: 我不认识任何现有成员，可以加入吗？\nA: 目前仅接受成员推荐。你可以先关注我们的公众号，等待公开招新。',
          'Q: 我住得比较远（如曼哈顿），可以申请吗？\nA: 我们的活动大多在 Edison 附近，建议来回车程在 45 分钟内，以便持续参加。',
          'Q: 加入后有什么义务？\nA: 无硬性义务，但我们希望你每季度至少参加 2 次活动；连续 3 个月不活跃将进入 "休眠" 状态。',
        ],
      },
    ],
    cta: { label: '立即推荐朋友', to: '/apply' },
  },

  'community-guidelines-v2': {
    title: '📋 社区公约 v2.0 更新',
    date: '2025-02-01',
    tag: '公告',
    intro:
      '经运营团队与核心成员讨论，我们更新了社区公约至 v2.0。主要增加了活动取消政策和隐私保护条款。以下是完整内容。',
    sections: [
      {
        heading: '🤝 基本原则',
        body: [
          '1. 真诚待人，不装、不演、不社交绩效',
          '2. 尊重每一位 Host 的 house rules',
          '3. 准时到达；如需取消请提前 24 小时通知',
          '4. 照片未经本人同意不得发布到社区外',
          '5. 活动中不推销、不拉群、不传教',
        ],
      },
      {
        heading: '🚫 活动取消政策（新增）',
        body: [
          '• 参与者：确认报名后无故缺席 2 次，将暂停 1 个月的报名权限',
          '• Host：活动前 48 小时内取消，需在群内说明原因并向已报名者致歉',
          '• 不可抗力（天气、紧急情况）取消不计入记录',
          '• 取消记录每季度清零',
        ],
      },
      {
        heading: '🔒 隐私保护（新增）',
        body: [
          '• 成员的个人信息（地址、电话、邮箱）仅在社区内可见',
          '• 活动照片默认仅社区内可见；如需对外发布需获得照片中所有人的同意',
          '• Host 的家庭地址仅向已确认参加的成员展示',
          '• 任何成员可随时要求删除自己的照片和个人信息',
        ],
      },
      {
        heading: '⚖️ 违规处理',
        body: [
          '轻微违规（迟到、临时取消）：运营提醒 + 记录',
          '中度违规（连续无故缺席、不遵守 house rules）：暂停活动权限 1 个月',
          '严重违规（骚扰、歧视、泄露隐私）：永久移出社区',
          '所有处理由至少 2 名运营共同决定，当事人有申诉权',
        ],
      },
      {
        heading: '📅 生效时间',
        body: [
          '本公约自 2025 年 2 月 1 日起生效。',
          '旧版公约（v1.0）同时废止。',
          '如有疑问请联系任意运营成员。',
        ],
      },
    ],
  },

  'host-training': {
    title: '🏠 新 Host 培训',
    date: '2025-01-20',
    tag: '培训',
    intro:
      '想成为 Host 但不确定怎么开始？我们将在本月举办线上培训会，帮助你了解 Host 的方方面面。',
    sections: [
      {
        heading: '📆 培训安排',
        body: [
          '日期：2025 年 3 月 8 日（周六）',
          '时间：下午 2:00 – 3:30（EST）',
          '形式：Zoom 线上（链接报名后发送）',
          '名额：限 8 人，先到先得',
        ],
      },
      {
        heading: '📖 培训内容',
        body: [
          '1. Host 的角色与责任（30 分钟）',
          '   - 串门活动的核心理念回顾',
          '   - Host vs. 参与者的不同视角',
          '   - 好 Host 的特质：细心、包容、有边界感',
          '',
          '2. 活动策划实操（30 分钟）',
          '   - 如何确定活动主题和人数',
          '   - 发出邀请：私人邀请阶段 → 公开报名阶段',
          '   - House Rules 怎么写？（示例模板分享）',
          '   - 场地准备 checklist',
          '',
          '3. 活动当天 & 善后（15 分钟）',
          '   - 怎么暖场、怎么收场',
          '   - 活动后记录：照片、留言、感谢卡提醒',
          '',
          '4. Q&A + 老 Host 经验分享（15 分钟）',
          '   - 白开水：电影夜 Host 心得',
          '   - Yuan：Potluck 筹备经验',
        ],
      },
      {
        heading: '🎓 培训后你会获得',
        body: [
          '• "Host" 角色标签，可在个人主页展示',
          '• 活动创建权限（可直接发布活动，无需运营审核）',
          '• Host 专属群，与其他 Host 交流经验',
          '• 第一次 Host 活动时运营一对一指导',
        ],
      },
      {
        heading: '✋ 适合谁？',
        body: [
          '• 已参加过至少 3 次串门活动',
          '• 有自己的聚会空间（客厅、地下室、后院均可）',
          '• 愿意每 1–2 个月 Host 一次活动',
          '• 有耐心、有责任感、享受招待朋友',
        ],
      },
      {
        heading: '💡 往期 Host 怎么说',
        body: [
          '"第一次当 Host 很紧张，但大家都很配合，后来发现根本不需要做太多，只要让大家自在就好。" —— 白开水',
          '"最开心的是活动之后收到感谢卡，觉得自己做的事被看见了。" —— 大橙子',
          '"准备过程其实也很享受，选片、布置、买零食，像在筹备一个小 party。" —— Yuan',
        ],
      },
    ],
    cta: { label: '我要报名培训', to: '/apply' },
  },
};

/* ═══ Component ═══ */
export default function AnnouncementPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const content = useMemo(() => {
    if (!slug) return null;
    return announcements[slug] ?? null;
  }, [slug]);

  if (!content) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
        <Typography variant="h6">未找到该公告</Typography>
        <Button variant="outlined" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Chip label={content.tag} size="small" color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {content.date}
            </Typography>
          </Stack>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            {content.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {content.intro}
          </Typography>
        </CardContent>
      </Card>

      {/* Sections */}
      {content.sections.map((section) => (
        <Card key={section.heading}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
              {section.heading}
            </Typography>
            <List dense disablePadding>
              {section.body.map((line, i) =>
                line === '' ? (
                  <Box key={i} sx={{ height: 8 }} />
                ) : (
                  <ListItem key={i} disableGutters sx={{ py: 0.3 }}>
                    <ListItemText
                      primary={line}
                      primaryTypographyProps={{
                        variant: 'body2',
                        color: 'text.secondary',
                        whiteSpace: 'pre-wrap',
                      }}
                    />
                  </ListItem>
                ),
              )}
            </List>
          </CardContent>
        </Card>
      ))}

      {/* CTA */}
      {content.cta && (
        <Box textAlign="center" sx={{ py: 1 }}>
          <Button variant="contained" size="large" onClick={() => navigate(content.cta!.to)}>
            {content.cta.label}
          </Button>
        </Box>
      )}

      {/* Back */}
      <Box textAlign="center">
        <Button variant="text" onClick={() => navigate('/')}>
          ← 返回动态
        </Button>
      </Box>
    </Stack>
  );
}
