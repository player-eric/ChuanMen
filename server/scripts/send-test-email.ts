import { PrismaClient } from '@prisma/client';

const DB_URL = 'postgresql://chuanmener:EqtTBH3lrqX3znYVP8MCdDboV8P1VHRN@dpg-d6eifm8gjchc73995ia0-a.ohio-postgres.render.com/chuanmener_dev';

async function main() {
  const prisma = new PrismaClient({ datasourceUrl: DB_URL });

  // Upsert new rules
  const rules = [
    { id: 'TXN-8',  displayOrder: 8,   cooldownDays: 0,  config: {} },
    { id: 'TXN-9',  displayOrder: 9,   cooldownDays: 0,  config: {} },
    { id: 'TXN-10', displayOrder: 10,  cooldownDays: 0,  config: {} },
    { id: 'TXN-11', displayOrder: 11,  cooldownDays: 0,  config: {} },
    { id: 'TXN-12', displayOrder: 12,  cooldownDays: 0,  config: {} },
    { id: 'TXN-13', displayOrder: 13,  cooldownDays: 0,  config: {} },
    { id: 'TXN-14', displayOrder: 14,  cooldownDays: 0,  config: {} },
    { id: 'TXN-15', displayOrder: 15,  cooldownDays: 0,  config: {} },
    { id: 'TXN-16', displayOrder: 16,  cooldownDays: 0,  config: {} },
    { id: 'TXN-17', displayOrder: 17,  cooldownDays: 0,  config: {} },
    { id: 'LOTTERY-DRAW', displayOrder: 60, cooldownDays: 0, config: {} },
    { id: 'LOTTERY-3X',   displayOrder: 61, cooldownDays: 30, config: {} },
  ];
  for (const r of rules) {
    await prisma.emailRule.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, enabled: true, displayOrder: r.displayOrder, cooldownDays: r.cooldownDays, config: r.config },
    });
    console.log(`Rule ${r.id} → OK`);
  }

  // Upsert templates
  const templates = [
    { ruleId: 'TXN-8', variantKey: 'default', subject: '【串门儿】{eventTitle} — 你已加入等位', body: '你好 {userName}，\n\n{eventTitle} 目前已满，你已加入等位名单（第{position}位）。\n\n有名额空出时我们会第一时间通知你，请耐心等待 🙏' },
    { ruleId: 'TXN-9', variantKey: 'default', subject: '【串门儿】好消息！{eventTitle} 有名额了', body: '你好 {userName}，\n\n{eventTitle} 有一个名额空出了！🎉\n\n请在24小时内确认是否参加，过期名额将自动顺延给下一位。' },
    { ruleId: 'TXN-10', variantKey: 'default', subject: '【串门儿】{eventTitle} — 报名成功', body: '你好 {userName}，\n\n你已成功报名参加「{eventTitle}」！🎉\n\n期待在活动中见到你，到时候见！' },
    { ruleId: 'TXN-11', variantKey: 'default', subject: '【串门儿】你已被接纳参加「{eventTitle}」', body: '你好 {userName}，\n\nHost 已接纳你参加「{eventTitle}」！🎉\n\n期待在活动中见到你～' },
    { ruleId: 'TXN-12', variantKey: 'default', subject: '【串门儿】{eventTitle} 等位未通过', body: '你好 {userName}，\n\n很遗憾，「{eventTitle}」的等位申请未通过。\n\n希望下次活动能见到你！别灰心，好活动一直都有 😊' },
    { ruleId: 'TXN-13', variantKey: 'default', subject: '【串门儿】你感兴趣的创意「{eventTitle}」变成活动了！', body: '你好 {userName}，\n\n你之前感兴趣的创意「{eventTitle}」已经有人组织啦！🎉\n\n快来看看并报名吧，别错过～' },
    { ruleId: 'TXN-14', variantKey: 'default', subject: '【串门儿】参加「{eventTitle}」获得感谢卡额度 +2', body: '你好 {userName}，\n\n感谢你参加「{eventTitle}」！你获得了 2 张感谢卡额度 ✉️\n\n快去给一起参加的小伙伴寄张感谢卡吧～' },
    { ruleId: 'TXN-15', variantKey: 'default', subject: '【串门儿】协办「{eventTitle}」获得感谢卡额度 +6', body: '你好 {userName}，\n\n感谢你协办「{eventTitle}」！作为 Co-Host 你获得了 6 张感谢卡额度（参加 +2，Host 奖励 +4）✉️\n\n快去给参与的小伙伴寄张感谢卡吧～' },
    { ruleId: 'TXN-16', variantKey: 'default', subject: '【串门儿】发起「{eventTitle}」获得感谢卡额度 +6', body: '你好 {userName}，\n\n感谢你组织「{eventTitle}」！作为 Host 你获得了 6 张感谢卡额度（参加 +2，Host 奖励 +4）✉️\n\n快去给参与的小伙伴寄张感谢卡吧～' },
    { ruleId: 'TXN-17', variantKey: 'default', subject: '【串门儿】{eventTitle} 的等位机会已过期', body: '你好 {userName}，\n\n「{eventTitle}」的等位名额已超过24小时未确认，机会已过期。\n\n希望下次活动能见到你！' },
    { ruleId: 'P0-C', variantKey: 'default', subject: '【串门儿】{eventTitle} 还差一个{taskRole}，你来吗？', body: '你好 {userName}，\n\n{eventTitle} 还有分工没人认领：\n\n{taskList}\n\n认领一个分工？大家都会感谢你的 💪' },
    { ruleId: 'LOTTERY-DRAW', variantKey: 'default', subject: '🎲 本周轮到你 Host 啦！', body: '你好 {userName}，\n\n这周轮到你来组织一次小聚！不用有压力，2-6 个人的小局就好。\n\n可以是：一起喝杯咖啡、散个步、看个电影、或者聊聊天。\n\n如果这周实在不方便，登录后可以点击跳过，没有任何影响 😊' },
    { ruleId: 'LOTTERY-3X', variantKey: 'default', subject: '【串门儿】{userName}，你已经是活跃分子了！', body: '你好 {userName}，\n\n你已经连续参加了 3 次活动，大家都很喜欢有你在！\n\n有没有兴趣试试做一次 Host？可以是很简单的小聚，2-6 个人，做点你喜欢的事就好。\n\n完全自愿，没有压力 😄' },
  ];
  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { ruleId_variantKey: { ruleId: t.ruleId, variantKey: t.variantKey } },
      update: {},
      create: { ruleId: t.ruleId, variantKey: t.variantKey, subject: t.subject, body: t.body, isActive: true },
    });
    console.log(`Template ${t.ruleId} → OK`);
  }

  await prisma.$disconnect();
  console.log('\nDone!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
