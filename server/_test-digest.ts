import { renderEmail, renderDigestBlock } from './src_v2/emails/template.js';
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const date = new Date().toISOString().split('T')[0];

const digestHtml = renderDigestBlock([
  {
    icon: '🎬', title: '新活动',
    items: [
      { text: '电影夜 · 花样年华（02/28）', url: 'https://chuanmener.club/events/1' },
      { text: '烘焙下午茶（03/05）', url: 'https://chuanmener.club/events/2' },
    ],
  },
  {
    icon: '📅', title: '即将开始',
    items: [
      { text: '周末 Potluck（03/02）', url: 'https://chuanmener.club/events/3' },
      { text: '春天 Kayaking（03/04）', url: 'https://chuanmener.club/events/4' },
    ],
  },
  {
    icon: '📖', title: '新推荐',
    items: [
      { text: 'Grounds For Sculpture — 大橙子推荐' },
      { text: '小森林（夏秋篇）— 星星推荐' },
    ],
  },
  {
    icon: '💌', title: '感谢卡',
    items: [{ text: '社区本周发出了 3 张新感谢卡' }],
  },
  {
    icon: '👥', title: '新成员',
    items: [{ text: 'Emily 加入了串门儿！' }],
  },
]);

const rendered = renderEmail({
  subject: `${date} · 串门儿社区近况`,
  body: '你好，来看看最近串门儿都发生了什么吧 👀',
  variables: {},
  htmlBlock: digestHtml,
  ctaLabel: '查看完整动态', ctaUrl: 'https://chuanmener.club',
});

async function main() {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@chuanmener.club',
    replyTo: 'hi@chuanmener.club',
    to: ['seewhymoon@gmail.com'],
    subject: rendered.subject, html: rendered.html, text: rendered.text,
  });
  if (error) { console.error('Failed:', error); process.exit(1); }
  console.log('Digest sent!', data!.id);
}
main();
