import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin users (v2.1: Yuan / 白开水 / 大橙子) ──
  const admins = [
    { name: 'Yuan', email: 'yuan@chuanmen.app' },
    { name: '白开水', email: 'baikaisui@chuanmen.app' },
    { name: '大橙子', email: 'dachengzi@chuanmen.app' },
  ];

  for (const admin of admins) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: {},
      create: {
        name: admin.name,
        email: admin.email,
        role: 'admin',
        userStatus: 'approved',
        bio: '串门儿管理员',
      },
    });
    console.log(`  ✅ Admin: ${admin.name}`);
  }

  // ── About content (串门原则 / Host 手册) ──
  const aboutEntries = [
    {
      type: 'principle' as const,
      title: '串门原则',
      contentMd: `## 串门原则

我们相信：

- **对的人 > 更多人** — 宁缺毋滥，每一个人都是被认真邀请的
- **相互支持 > 社交隔绝** — 我们不只是一起玩，而是真正在乎彼此
- **客厅 > 写字楼** — 最好的交流发生在放松的环境里
- **真诚 > 客气** — 礼貌但不虚伪，真实是我们最看重的品质

### 关于活动

- 准时到达，尊重 Host 的时间
- 遵守 House Rules
- 帮忙收拾是基本礼貌
- 不推销、不越界

### 关于社群

- 每个人的贡献都会被看到
- 鼓励参与，不强制输出
- 对不同观点保持开放`,
    },
    {
      type: 'host_guide' as const,
      title: 'Host 手册',
      contentMd: `## Host 手册

感谢你愿意打开家门（或组织一场活动）！

### 准备

1. 确定时间、地点、人数上限
2. 写好 House Rules（脱鞋？宠物？结束时间？）
3. 选好电影（如果是电影夜）

### 当天

- 提前 30 分钟准备好场地
- 准备一些简单的饮品/零食
- 帮助大家互相认识

### 之后

- 上传几张照片到活动记录
- 给特别感谢的人寄张卡`,
    },
    {
      type: 'about' as const,
      title: '关于串门儿',
      contentMd: `## 关于串门儿

串门儿是一群住在新泽西的朋友，通过小型聚会认识彼此、相互支持。

我们相信最好的友谊来自真实的相处，而不是线上的点赞。

串门儿是一个申请制的共创社区——每一个人都是被认真邀请的，每一个人的参与都会被看到。`,
    },
  ];

  for (const entry of aboutEntries) {
    const existing = await prisma.aboutContent.findFirst({
      where: { type: entry.type, title: entry.title },
    });

    if (!existing) {
      await prisma.aboutContent.create({
        data: {
          type: entry.type,
          title: entry.title,
          contentMd: entry.contentMd,
          published: true,
        },
      });
      console.log(`  ✅ AboutContent: ${entry.title}`);
    } else {
      console.log(`  ⏭️  AboutContent already exists: ${entry.title}`);
    }
  }

  console.log('🌱 Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
