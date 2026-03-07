/**
 * Test script: send all email templates to a test address.
 * Usage: DATABASE_URL=... RESEND_API_KEY=... npx tsx scripts/test-all-emails.ts <email>
 */
import { PrismaClient } from '@prisma/client';
import { sendTemplatedEmail } from '../src_v2/services/emailService.js';
import { renderDigestBlock } from '../src_v2/emails/template.js';
import { renderPostcardBlock } from '../src_v2/emails/template.js';

const prisma = new PrismaClient();
const to = process.argv[2] || 'seewhymoon@gmail.com';

const testVars: Record<string, {
  variables: Record<string, string>;
  ctaLabel?: string;
  ctaUrl?: string;
  htmlBlock?: string;
}> = {
  'P0-A': {
    variables: { userName: 'Yuan', hostName: 'Alice', eventTitle: '周末观影会', eventDate: '3月15日 周六', eventLocation: 'Manhattan' },
    ctaLabel: '查看活动并接受邀请',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'P0-B': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会', eventDate: '3月15日 周六 14:00', eventLocation: 'Manhattan', hostName: 'Alice', attendeeCount: '6', taskInfo: '你的分工：带零食' },
    ctaLabel: '查看活动详情',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'P0-C': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会', eventDate: '3月15日 周六' },
    ctaLabel: '加入等位',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'P0-D': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会', eventDate: '3月15日 周六 14:00', eventLocation: 'Manhattan' },
    ctaLabel: '查看活动详情',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'P1': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会', hostName: 'Alice', recMention: '今天我们一起看了「花束般的恋爱」' },
    ctaLabel: '回顾活动',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'P2-A': {
    variables: { userName: 'Yuan', hostName: 'Alice', eventTitle: '春日野餐', eventDate: '3月22日 周六', eventLocation: 'Central Park' },
    ctaLabel: '查看活动',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'P2-B': {
    variables: { userName: 'Yuan', authorName: 'Bob', recTitle: '三体' },
    ctaLabel: '查看推荐',
    ctaUrl: 'https://chuanmener.club/discover/recommendations/test',
  },
  'P3-A': {
    variables: { userName: 'Yuan' },
    ctaLabel: '去串门儿看看',
    ctaUrl: 'https://chuanmener.club',
  },
  'P3-B': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会' },
    ctaLabel: '回顾活动',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'P3-C': {
    variables: { userName: 'Yuan', upcomingEvents: '春日野餐, 周末观影会, 桌游之夜' },
    ctaLabel: '浏览活动',
    ctaUrl: 'https://chuanmener.club/events',
  },
  'P3-D': {
    variables: { userName: 'Yuan' },
    ctaLabel: '发起活动',
    ctaUrl: 'https://chuanmener.club/events/create',
  },
  'P3-E': {
    variables: { userName: 'Yuan' },
    ctaLabel: '发起活动',
    ctaUrl: 'https://chuanmener.club/events/create',
  },
  'P3-F': {
    variables: { userName: 'Yuan', newEventCount: '5', newMemberCount: '3', newRecCount: '8' },
    ctaLabel: '回来看看',
    ctaUrl: 'https://chuanmener.club',
  },
  'P3-G': {
    variables: { userName: 'Yuan', upcomingEvents: '春日野餐、周末观影会、桌游之夜' },
    ctaLabel: '查看最新活动',
    ctaUrl: 'https://chuanmener.club/events',
  },
  'P4-A': {
    variables: { userName: 'Yuan', milestoneTitle: '串门儿第 100 场活动达成！' },
    ctaLabel: '查看详情',
    ctaUrl: 'https://chuanmener.club',
  },
  'P4-B': {
    variables: { userName: 'Yuan', newRecCount: '5', recList: '📖 三体\n🎬 花束般的恋爱\n🍽 红烧肉做法\n📍 Brooklyn Bridge Park\n🎵 周杰伦新专辑' },
    ctaLabel: '查看所有推荐',
    ctaUrl: 'https://chuanmener.club/discover',
  },
  'P4-C': {
    variables: { userName: 'Yuan' },
    ctaLabel: '查看详情',
    ctaUrl: 'https://chuanmener.club',
  },
  'TXN-1': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会', eventDate: '3月15日 周六', hostName: 'Alice' },
    ctaLabel: '查看其他活动',
    ctaUrl: 'https://chuanmener.club/events',
  },
  'TXN-2': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会', eventDate: '3月16日 周日', eventLocation: 'Brooklyn' },
    ctaLabel: '查看活动详情',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'TXN-3': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会', eventDate: '3月15日 周六', eventLocation: 'Manhattan' },
    ctaLabel: '查看活动详情',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'TXN-4': {
    variables: { name: 'Yuan', userName: 'Yuan', siteUrl: 'https://chuanmener.club', loginUrl: 'https://chuanmener.club/login' },
    ctaLabel: '登录串门儿',
    ctaUrl: 'https://chuanmener.club/login',
  },
  'TXN-5': {
    variables: { name: 'Yuan' },
  },
  'TXN-6': {
    variables: { userName: 'Yuan', eventTitle: '周末观影会' },
    ctaLabel: '确认参加',
    ctaUrl: 'https://chuanmener.club/events/test',
  },
  'TXN-7': {
    variables: { fromName: 'Alice', toName: 'Yuan' },
    ctaLabel: '查看感谢卡',
    ctaUrl: 'https://chuanmener.club/cards',
    htmlBlock: renderPostcardBlock({
      fromName: 'Alice',
      toName: 'Yuan',
      message: '谢谢你上次带的蛋糕，超好吃！下次再约～',
      date: '03/07',
      stampLabel: '暖心',
    }),
  },
  'DIGEST': {
    variables: { date: '2026-03-07' },
    htmlBlock: renderDigestBlock([
      { icon: '🎬', title: '新活动', items: [{ text: '春日野餐（03/22）', url: 'https://chuanmener.club/events/test' }] },
      { icon: '📖', title: '新推荐', items: [{ text: '三体' }, { text: '花束般的恋爱' }] },
      { icon: '👥', title: '新成员', items: [{ text: '李卓 加入了串门儿！' }] },
    ]),
    ctaLabel: '查看完整动态',
    ctaUrl: 'https://chuanmener.club',
  },
};

async function main() {
  console.log(`Sending ${Object.keys(testVars).length} test emails to ${to}...\n`);

  let success = 0;
  let failed = 0;

  for (const [ruleId, config] of Object.entries(testVars)) {
    try {
      const result = await sendTemplatedEmail(prisma, {
        to,
        ruleId,
        variables: config.variables,
        ctaLabel: config.ctaLabel,
        ctaUrl: config.ctaUrl,
        htmlBlock: config.htmlBlock,
      });
      console.log(`  [OK] ${ruleId} — ${result.MessageId}`);
      success++;
    } catch (err: any) {
      console.log(`  [FAIL] ${ruleId} — ${err.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nDone: ${success} sent, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
