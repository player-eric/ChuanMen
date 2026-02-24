import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/* ════════════════════════════════════════════════════════
   Seed helper: upsert by email for users, findFirst-or-create for others
   ════════════════════════════════════════════════════════ */

function days(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log('🌱 Seeding database …');

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     1. Users (12 members matching frontend mock)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const userSeeds = [
    { name: 'Yuan',   email: 'yuan@chuanmen.app',        role: 'admin', status: 'approved' as const, bio: '串门儿创始人，Edison 居民', city: 'Edison, NJ',        hostCount: 6,  participationCount: 24, postcardCredits: 10 },
    { name: '白开水', email: 'baikaisui@chuanmen.app',   role: 'admin', status: 'approved' as const, bio: '电影爱好者 / 资深 Host',     city: 'Edison, NJ',        hostCount: 8,  participationCount: 18, postcardCredits: 8 },
    { name: '大橙子', email: 'dachengzi@chuanmen.app',   role: 'admin', status: 'approved' as const, bio: '设计师，喜欢拍照和咖啡',     city: 'Jersey City, NJ',   hostCount: 5,  participationCount: 14, postcardCredits: 6 },
    { name: '星星',   email: 'star@chuanmen.app',        role: 'member', status: 'approved' as const, bio: '研究生在读，热爱桌游',       city: 'Princeton, NJ',     hostCount: 0,  participationCount: 8,  postcardCredits: 4 },
    { name: 'Tiffy',  email: 'tiffy@chuanmen.app',       role: 'host',  status: 'approved' as const, bio: '烘焙达人，周末最爱 Potluck', city: 'Edison, NJ',        hostCount: 3,  participationCount: 10, postcardCredits: 6 },
    { name: '小鱼',   email: 'xiaoyu@chuanmen.app',      role: 'member', status: 'approved' as const, bio: '刚搬来新泽西，爱户外',       city: 'New Brunswick, NJ', hostCount: 0,  participationCount: 5,  postcardCredits: 4 },
    { name: 'Leo',    email: 'leo@chuanmen.app',         role: 'member', status: 'approved' as const, bio: '程序员，偶尔弹吉他',         city: 'Hoboken, NJ',       hostCount: 1,  participationCount: 6,  postcardCredits: 4 },
    { name: 'Mia',    email: 'mia@chuanmen.app',         role: 'member', status: 'approved' as const, bio: '新人，第一次参加活动',       city: 'Edison, NJ',        hostCount: 0,  participationCount: 1,  postcardCredits: 2 },
    { name: '阿德',   email: 'ade@chuanmen.app',         role: 'member', status: 'approved' as const, bio: '音乐人，录音棚爱好者',       city: 'Montclair, NJ',     hostCount: 2,  participationCount: 5,  postcardCredits: 4 },
    { name: '奶茶',   email: 'naicha@chuanmen.app',      role: 'member', status: 'approved' as const, bio: '奶茶品鉴师（自封的）',       city: 'Edison, NJ',        hostCount: 0,  participationCount: 3,  postcardCredits: 4 },
    { name: 'Derek',  email: 'derek@chuanmen.app',       role: 'member', status: 'approved' as const, bio: '户外运动达人',               city: 'Bridgewater, NJ',   hostCount: 2,  participationCount: 7,  postcardCredits: 4 },
    { name: '小樱',   email: 'xiaoying@chuanmen.app',    role: 'member', status: 'approved' as const, bio: '安静的插画师',               city: 'Princeton, NJ',     hostCount: 0,  participationCount: 2,  postcardCredits: 2 },
    // Applicants
    { name: '张三',   email: 'zhangsan@example.com',     role: 'member', status: 'applicant' as const, bio: 'Rutgers CS PhD，喜欢做饭和桌游', city: 'Edison, NJ',   hostCount: 0, participationCount: 0, postcardCredits: 0 },
    { name: 'Emily',  email: 'emily@example.com',        role: 'member', status: 'applicant' as const, bio: '设计师，刚从纽约搬来',           city: 'New Brunswick, NJ', hostCount: 0, participationCount: 0, postcardCredits: 0 },
  ];

  const users: Record<string, string> = {}; // name → id

  for (const u of userSeeds) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        userStatus: u.status,
        bio: u.bio,
        city: u.city,
        hostCount: u.hostCount,
        participationCount: u.participationCount,
        postcardCredits: u.postcardCredits,
        location: u.city,
      },
    });
    users[u.name] = row.id;
    console.log(`  ✅ User: ${u.name} (${u.status})`);
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     2. Operator roles
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const opRoles = [
    { user: '大橙子', value: '🎨 设计总管' },
    { user: 'Tiffy',  value: '📷 活动摄影师' },
    { user: '奶茶',   value: '📱 社媒小助手' },
    { user: 'Derek',  value: '✍️ 内容主笔' },
    { user: 'Yuan',   value: '🔧 技术支持' },
  ];
  for (const r of opRoles) {
    await prisma.userOperatorRole.upsert({
      where: { userId_value: { userId: users[r.user]!, value: r.value } },
      update: {},
      create: { userId: users[r.user]!, value: r.value },
    });
  }
  console.log('  ✅ Operator roles');

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     3. Movies (pool)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const movieSeeds = [
    { title: '花样年华', year: 2000, director: '王家卫', by: '白开水', status: 'candidate' as const, votes: 8 },
    { title: '重庆森林', year: 1994, director: '王家卫', by: 'Yuan',   status: 'candidate' as const, votes: 6 },
    { title: '寄生虫',   year: 2019, director: '奉俊昊', by: '大橙子', status: 'screened'  as const, votes: 10 },
    { title: '千与千寻', year: 2001, director: '宫崎骏', by: '星星',   status: 'screened'  as const, votes: 7 },
    { title: '饮食男女', year: 1994, director: '李安',   by: 'Tiffy',  status: 'candidate' as const, votes: 5 },
    { title: '燃烧',     year: 2018, director: '李沧东', by: 'Leo',    status: 'candidate' as const, votes: 4 },
    { title: '小偷家族', year: 2018, director: '是枝裕和', by: '阿德', status: 'candidate' as const, votes: 3 },
  ];

  const movies: Record<string, string> = {}; // title → id
  for (const m of movieSeeds) {
    const existing = await prisma.movie.findFirst({ where: { title: m.title } });
    if (existing) {
      movies[m.title] = existing.id;
      console.log(`  ⏭️  Movie exists: ${m.title}`);
    } else {
      const row = await prisma.movie.create({
        data: {
          title: m.title,
          year: m.year,
          director: m.director,
          recommendedById: users[m.by]!,
          status: m.status,
        },
      });
      movies[m.title] = row.id;
      // Add votes
      const voters = Object.entries(users).slice(0, m.votes);
      for (const [, uid] of voters) {
        await prisma.movieVote.upsert({
          where: { movieId_userId: { movieId: row.id, userId: uid } },
          update: {},
          create: { movieId: row.id, userId: uid },
        });
      }
      console.log(`  ✅ Movie: ${m.title} (${m.votes} votes)`);
    }
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     4. Events (upcoming + past)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const eventSeeds = [
    // Upcoming
    { title: '电影夜 · 花样年华', host: '白开水', tags: ['movie']    as const, phase: 'open'   as const, status: 'scheduled' as const, startsAt: days(3),  capacity: 10, location: '白开水家 · Edison, NJ', isHome: true, houseRules: '请换鞋入内 · 10pm 前结束', movieTitle: '花样年华' },
    { title: '重庆森林 · 私人邀请', host: 'Yuan', tags: ['movie']   as const, phase: 'invite' as const, status: 'scheduled' as const, startsAt: days(8),  capacity: 6,  location: 'Yuan 家 · Edison, NJ',   isHome: true, houseRules: '请提前 10 分钟到', movieTitle: '重庆森林' },
    { title: '周末 Potluck',       host: 'Tiffy', tags: ['chuanmen'] as const, phase: 'open'   as const, status: 'scheduled' as const, startsAt: days(10), capacity: 8,  location: 'Tiffy 家 · Edison, NJ',  isHome: true, houseRules: '每人带一道菜' },
    { title: '春天 Kayaking',      host: 'Derek', tags: ['outdoor']  as const, phase: 'invite' as const, status: 'scheduled' as const, startsAt: days(17), capacity: 8,  location: 'Raritan River, NJ',      isHome: false },
    { title: '烘焙下午茶',         host: 'Tiffy', tags: ['chuanmen'] as const, phase: 'open'   as const, status: 'scheduled' as const, startsAt: days(24), capacity: 6,  location: 'Tiffy 家 · Edison, NJ',  isHome: true },
    // Past
    { title: '电影夜 · 寄生虫',    host: '白开水', tags: ['movie']   as const, phase: 'ended'  as const, status: 'completed' as const, startsAt: days(-14), capacity: 10, location: '白开水家', isHome: true, movieTitle: '寄生虫' },
    { title: '新年饭局 Potluck',   host: 'Yuan',   tags: ['chuanmen'] as const, phase: 'ended'  as const, status: 'completed' as const, startsAt: days(-28), capacity: 12, location: 'Yuan 家', isHome: true },
    { title: '电影夜 · 千与千寻',  host: 'Yuan',   tags: ['movie']   as const, phase: 'ended'  as const, status: 'completed' as const, startsAt: days(-35), capacity: 8,  location: 'Yuan 家', isHome: true, movieTitle: '千与千寻' },
    { title: 'High Point 徒步',   host: '大橙子', tags: ['hiking']   as const, phase: 'ended'  as const, status: 'completed' as const, startsAt: days(-42), capacity: 8,  location: 'High Point State Park, NJ', isHome: false },
    // Cancelled
    { title: '滑雪 · Mountain Creek', host: 'Derek', tags: ['outdoor'] as const, phase: 'cancelled' as const, status: 'cancelled' as const, startsAt: days(-5), capacity: 8, location: 'Mountain Creek, NJ', isHome: false },
  ];

  const events: Record<string, string> = {}; // title → id
  for (const e of eventSeeds) {
    const existing = await prisma.event.findFirst({ where: { title: e.title } });
    if (existing) {
      events[e.title] = existing.id;
      console.log(`  ⏭️  Event exists: ${e.title}`);
      continue;
    }
    const row = await prisma.event.create({
      data: {
        title: e.title,
        hostId: users[e.host]!,
        tags: e.tags as any,
        phase: e.phase,
        status: e.status,
        startsAt: e.startsAt,
        capacity: e.capacity,
        location: e.location,
        isHomeEvent: e.isHome ?? false,
        houseRules: e.houseRules ?? '',
        selectedMovieId: e.movieTitle ? (movies[e.movieTitle] ?? null) : null,
      },
    });
    events[e.title] = row.id;
    console.log(`  ✅ Event: ${e.title}`);
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     5. Event signups (spread members across events)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const signupMap: Record<string, string[]> = {
    '电影夜 · 花样年华': ['Yuan', '星星', 'Tiffy', '小鱼', 'Leo', 'Mia'],
    '重庆森林 · 私人邀请': ['白开水', 'Tiffy'],
    '周末 Potluck': ['Yuan', '白开水', '大橙子', '阿德'],
    '电影夜 · 寄生虫': ['Yuan', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', '阿德', '奶茶'],
    '新年饭局 Potluck': ['白开水', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', '阿德', '奶茶', 'Derek', 'Mia'],
    '电影夜 · 千与千寻': ['白开水', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', '阿德'],
    'High Point 徒步': ['Yuan', '白开水', 'Derek', '阿德', 'Leo', '小鱼'],
  };

  for (const [eventTitle, memberNames] of Object.entries(signupMap)) {
    const eventId = events[eventTitle];
    if (!eventId) continue;
    for (const name of memberNames) {
      const userId = users[name];
      if (!userId) continue;
      await prisma.eventSignup.upsert({
        where: { eventId_userId: { eventId, userId } },
        update: {},
        create: {
          eventId,
          userId,
          status: 'accepted',
          participated: eventTitle.includes('寄生虫') || eventTitle.includes('新年') || eventTitle.includes('千与千寻') || eventTitle.includes('High Point'),
        },
      });
    }
  }
  console.log('  ✅ Event signups');

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     6. Proposals
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const proposalSeeds = [
    { title: '周末读书会',   author: '星星', description: '一起读一本书然后讨论，不需要提前看完', status: 'discussing' as const },
    { title: '中央公园野餐', author: '小鱼', description: '天气好的话在 Central Park 铺野餐垫', status: 'discussing' as const },
    { title: '自制拉面之夜', author: 'Tiffy', description: '从面条开始做！需要提前准备汤底',   status: 'discussing' as const },
    { title: '观星活动',     author: 'Derek', description: '去光污染少的地方看星星',            status: 'discussing' as const },
    { title: '录音棚体验日', author: '阿德', description: '带大家参观我朋友的录音棚',            status: 'scheduled'  as const },
  ];

  for (const p of proposalSeeds) {
    const existing = await prisma.proposal.findFirst({ where: { title: p.title } });
    if (existing) {
      console.log(`  ⏭️  Proposal exists: ${p.title}`);
      continue;
    }
    const row = await prisma.proposal.create({
      data: {
        title: p.title,
        description: p.description,
        authorId: users[p.author]!,
        status: p.status,
      },
    });
    // Add some votes
    const voterNames = Object.keys(users).filter(n => n !== p.author).slice(0, 4);
    for (const vn of voterNames) {
      await prisma.proposalVote.upsert({
        where: { proposalId_userId: { proposalId: row.id, userId: users[vn]! } },
        update: {},
        create: { proposalId: row.id, userId: users[vn]! },
      });
    }
    console.log(`  ✅ Proposal: ${p.title}`);
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     7. Postcards
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const postcardSeeds = [
    { from: 'Yuan',   to: '白开水', message: '谢谢每次电影夜的精心准备 🎬', visibility: 'public'  as const },
    { from: '星星',   to: 'Tiffy',  message: '你做的蛋糕太好吃了！🍰',      visibility: 'public'  as const },
    { from: '白开水', to: 'Yuan',   message: '感谢一直以来的支持 ❤️',       visibility: 'private' as const },
    { from: 'Tiffy',  to: '大橙子', message: '上次拍的照片好好看 📷',       visibility: 'public'  as const },
    { from: 'Derek',  to: '阿德',   message: '录音棚太酷了！🎵',            visibility: 'public'  as const },
    { from: '小鱼',   to: 'Yuan',   message: '谢谢带我们 hiking！🏔️',     visibility: 'public'  as const },
    { from: 'Leo',    to: '白开水', message: '花样年华选得真好',             visibility: 'public'  as const },
    { from: '大橙子', to: 'Tiffy',  message: 'Potluck 每次都好开心 🥘',     visibility: 'public'  as const },
  ];

  for (const pc of postcardSeeds) {
    const fromId = users[pc.from]!;
    const toId = users[pc.to]!;
    const existing = await prisma.postcard.findFirst({
      where: { fromId, toId, message: pc.message },
    });
    if (!existing) {
      await prisma.postcard.create({
        data: { fromId, toId, message: pc.message, visibility: pc.visibility },
      });
    }
  }
  console.log('  ✅ Postcards (8)');

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     8. Recommendations
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const recSeeds = [
    { title: '万历十五年',    category: 'movie' as const,  author: 'Yuan',   description: '黄仁宇经典，适合聊历史的时候一起看' },
    { title: 'Soba Noodle Salad', category: 'recipe' as const, author: 'Tiffy', description: '清爽的荞麦面沙拉，夏天必备' },
    { title: 'Mitski - Nobody', category: 'music' as const, author: 'Leo',   description: '一首让人安静下来的歌' },
    { title: 'Grounds For Sculpture', category: 'place' as const, author: '大橙子', description: 'Hamilton 的雕塑公园，拍照绝佳' },
    { title: '小森林（夏秋篇）', category: 'movie' as const, author: '星星', description: '看完会想做饭的电影' },
  ];

  for (const r of recSeeds) {
    const existing = await prisma.recommendation.findFirst({ where: { title: r.title } });
    if (!existing) {
      await prisma.recommendation.create({
        data: {
          title: r.title,
          category: r.category,
          description: r.description,
          authorId: users[r.author]!,
          status: 'featured',
        },
      });
    }
  }
  console.log('  ✅ Recommendations (5)');

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     9. About content
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const aboutEntries: { type: 'principle' | 'host_guide' | 'about' | 'letter'; title: string; content: string }[] = [
    {
      type: 'principle',
      title: '串门原则',
      content: `## 串门原则\n\n我们相信：\n\n- **对的人 > 更多人** — 宁缺毋滥\n- **相互支持 > 社交隔绝** — 真正在乎彼此\n- **客厅 > 写字楼** — 最好的交流发生在放松的环境里\n- **真诚 > 客气** — 礼貌但不虚伪\n\n### 关于活动\n\n- 准时到达，尊重 Host 的时间\n- 遵守 House Rules\n- 帮忙收拾是基本礼貌\n- 不推销、不越界`,
    },
    {
      type: 'host_guide',
      title: 'Host 手册',
      content: `## Host 手册\n\n感谢你愿意打开家门！\n\n### 准备\n\n1. 确定时间、地点、人数上限\n2. 写好 House Rules\n3. 选好电影（如果是电影夜）\n\n### 当天\n\n- 提前 30 分钟准备好场地\n- 准备一些简单的饮品/零食\n- 帮助大家互相认识\n\n### 之后\n\n- 上传照片到活动记录\n- 给特别感谢的人寄张卡`,
    },
    {
      type: 'about',
      title: '关于串门儿',
      content: `## 关于串门儿\n\n串门儿是一群住在新泽西的朋友，通过小型聚会认识彼此、相互支持。\n\n我们相信最好的友谊来自真实的相处，而不是线上的点赞。\n\n串门儿是一个申请制的共创社区——每一个人都是被认真邀请的。`,
    },
    {
      type: 'letter',
      title: '串门来信',
      content: `## 串门来信 #12\n\n大家好！\n\n上周我们连续举办了三场活动，这在串门儿的历史上还是第一次。\n\n电影夜看了「寄生虫」，讨论非常热烈；周末 Potluck 大家带的菜越来越有创意；High Point 徒步虽然冷但风景绝美。\n\n感谢每一位 Host 和参与者！`,
    },
  ];

  for (const entry of aboutEntries) {
    const existing = await prisma.aboutContent.findFirst({
      where: { type: entry.type, title: entry.title },
    });
    if (!existing) {
      await prisma.aboutContent.create({
        data: { type: entry.type, title: entry.title, content: entry.content, published: true },
      });
      console.log(`  ✅ AboutContent: ${entry.title}`);
    } else {
      console.log(`  ⏭️  AboutContent exists: ${entry.title}`);
    }
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     10. Announcements
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const announcementSeeds = [
    { title: '🎉 串门儿两周年快乐！',     body: '串门儿已经陪伴大家两年了，感谢每一位成员。', published: true },
    { title: '📣 新功能：感谢卡上线',      body: '现在可以给活动中特别帮忙的朋友寄一张虚拟感谢卡啦。', published: true },
    { title: '🏠 Host 招募中',            body: '如果你想尝试当 Host，联系任何一位管理员！',  published: true },
  ];
  for (const a of announcementSeeds) {
    const existing = await prisma.announcement.findFirst({ where: { title: a.title } });
    if (!existing) {
      await prisma.announcement.create({
        data: { title: a.title, body: a.body, published: a.published, authorId: users['Yuan']! },
      });
    }
  }
  console.log('  ✅ Announcements (3)');

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     11. Likes & Comments (cross-entity)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  // Like some events
  const pastEventTitles = ['电影夜 · 寄生虫', '新年饭局 Potluck', '电影夜 · 千与千寻'];
  for (const title of pastEventTitles) {
    const eid = events[title];
    if (!eid) continue;
    const likerNames = Object.keys(users).slice(0, 6);
    for (const ln of likerNames) {
      await prisma.like.upsert({
        where: { entityType_entityId_userId: { entityType: 'event', entityId: eid, userId: users[ln]! } },
        update: {},
        create: { entityType: 'event', entityId: eid, userId: users[ln]! },
      });
    }
  }

  // Add some comments
  const commentSeeds = [
    { entity: 'event', entityTitle: '电影夜 · 寄生虫', author: '星星', content: '这部电影太震撼了！讨论环节特别精彩' },
    { entity: 'event', entityTitle: '电影夜 · 寄生虫', author: 'Tiffy', content: '白开水准备的韩国零食好好吃 🍜' },
    { entity: 'event', entityTitle: '新年饭局 Potluck', author: '小鱼', content: '第一次参加就感受到大家好热情！' },
    { entity: 'event', entityTitle: 'High Point 徒步', author: 'Derek', content: '虽然冷但是风景绝了 🏔️' },
  ];
  for (const c of commentSeeds) {
    const entityId = events[c.entityTitle];
    if (!entityId) continue;
    const existing = await prisma.comment.findFirst({
      where: { entityType: c.entity as any, entityId, authorId: users[c.author]!, content: c.content },
    });
    if (!existing) {
      await prisma.comment.create({
        data: { entityType: c.entity as any, entityId, authorId: users[c.author]!, content: c.content },
      });
    }
  }
  console.log('  ✅ Likes & Comments');

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     12. Weekly lottery (sample)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const lotteryExisting = await prisma.weeklyLottery.findFirst({ where: { weekKey: '2026-W08' } });
  if (!lotteryExisting) {
    await prisma.weeklyLottery.create({
      data: { weekKey: '2026-W08', weekNumber: 8, drawnMemberId: users['星星']!, status: 'pending' },
    });
    console.log('  ✅ Weekly lottery (W08)');
  }

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     13. Email rules & templates
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  await seedEmailRulesAndTemplates();

  console.log('\n🌱 Seed complete!');
}

// ── Email rules & templates ─────────────────────────────────

async function seedEmailRulesAndTemplates() {
  // ── 23 EmailRule rows ──
  const rules: { id: string; displayOrder: number; cooldownDays: number; config: object }[] = [
    { id: 'TXN-1', displayOrder: 1,   cooldownDays: 0,  config: {} },
    { id: 'TXN-2', displayOrder: 2,   cooldownDays: 0,  config: {} },
    { id: 'TXN-3', displayOrder: 3,   cooldownDays: 0,  config: {} },
    { id: 'TXN-4', displayOrder: 4,   cooldownDays: 0,  config: {} },
    { id: 'TXN-5', displayOrder: 5,   cooldownDays: 0,  config: {} },
    { id: 'TXN-6', displayOrder: 6,   cooldownDays: 0,  config: {} },
    { id: 'P0-A',  displayOrder: 10,  cooldownDays: 0,  config: {} },
    { id: 'P0-B',  displayOrder: 11,  cooldownDays: 0,  config: {} },
    { id: 'P0-C',  displayOrder: 12,  cooldownDays: 0,  config: {} },
    { id: 'P0-D',  displayOrder: 13,  cooldownDays: 0,  config: {} },
    { id: 'P1',    displayOrder: 20,  cooldownDays: 3,  config: {} },
    { id: 'P2-A',  displayOrder: 30,  cooldownDays: 0,  config: {} },
    { id: 'P2-B',  displayOrder: 31,  cooldownDays: 0,  config: {} },
    { id: 'P3-A',  displayOrder: 40,  cooldownDays: 7,  config: {} },
    { id: 'P3-B',  displayOrder: 41,  cooldownDays: 0,  config: {} },
    { id: 'P3-C',  displayOrder: 42,  cooldownDays: 3,  config: { maxDaysSinceJoin: 14 } },
    { id: 'P3-D',  displayOrder: 43,  cooldownDays: 14, config: {} },
    { id: 'P3-E',  displayOrder: 44,  cooldownDays: 30, config: { inactiveDays: 60 } },
    { id: 'P3-F',  displayOrder: 45,  cooldownDays: 30, config: { inactiveDays: 45 } },
    { id: 'P4-A',  displayOrder: 50,  cooldownDays: 0,  config: {} },
    { id: 'P4-B',  displayOrder: 51,  cooldownDays: 7,  config: { minNewMovies: 2 } },
    { id: 'P4-C',  displayOrder: 52,  cooldownDays: 0,  config: {} },
    { id: 'DIGEST', displayOrder: 100, cooldownDays: 0, config: {} },
  ];

  for (const r of rules) {
    await prisma.emailRule.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        enabled: true,
        displayOrder: r.displayOrder,
        cooldownDays: r.cooldownDays,
        config: r.config,
      },
    });
  }
  console.log(`  ✅ EmailRules (${rules.length})`);

  // ── 10 EmailTemplate starter rows ──
  const templates: { ruleId: string; variantKey: string; subject: string; body: string }[] = [
    {
      ruleId: 'TXN-1',
      variantKey: 'default',
      subject: '【串门儿】活动「{eventTitle}」已取消',
      body: '你好 {userName}，\n\n很抱歉通知你，「{eventTitle}」（原定 {eventDate}）已被取消。\n\n如有疑问，请联系活动 Host {hostName}。\n\n— 串门儿团队',
    },
    {
      ruleId: 'TXN-2',
      variantKey: 'default',
      subject: '【串门儿】活动「{eventTitle}」信息变更',
      body: '你好 {userName}，\n\n「{eventTitle}」的信息有更新：\n\n时间：{eventDate}\n地点：{eventLocation}\n\n请留意最新安排。\n\n— 串门儿团队',
    },
    {
      ruleId: 'TXN-3',
      variantKey: 'default',
      subject: '【串门儿】恭喜！你已被「{eventTitle}」录取',
      body: '你好 {userName}，\n\n好消息！你在「{eventTitle}」的候补已转正。\n\n活动时间：{eventDate}\n地点：{eventLocation}\n\n期待见到你！\n\n— 串门儿团队',
    },
    {
      ruleId: 'TXN-4',
      variantKey: 'default',
      subject: '欢迎加入串门儿，{userName}！',
      body: '你好 {userName}，\n\n恭喜你通过了串门儿的申请！🎉\n\n你现在可以：\n• 浏览和报名活动\n• 推荐电影和书籍\n• 给朋友发送感谢卡\n\n快来看看最近有什么活动吧！\n\n— 串门儿团队',
    },
    {
      ruleId: 'TXN-5',
      variantKey: 'default',
      subject: '【串门儿】申请结果通知',
      body: '你好，\n\n感谢你对串门儿的兴趣。经过审核，我们暂时未能通过你的申请。\n\n这并不代表永久拒绝，欢迎你在未来再次申请。\n\n— 串门儿团队',
    },
    {
      ruleId: 'TXN-6',
      variantKey: 'default',
      subject: '【串门儿】恭喜中签！',
      body: '你好 {userName}，\n\n本周抽签结果出炉，你已中签！🎊\n\n请尽快确认你的参加意愿。\n\n— 串门儿团队',
    },
    {
      ruleId: 'P0-A',
      variantKey: 'default',
      subject: '【串门儿】你被邀请参加「{eventTitle}」',
      body: '你好 {userName}，\n\n{hostName} 邀请你参加「{eventTitle}」！\n\n时间：{eventDate}\n地点：{eventLocation}\n\n快来报名吧！\n\n— 串门儿团队',
    },
    {
      ruleId: 'P0-B',
      variantKey: 'default',
      subject: '【串门儿】明天见！「{eventTitle}」即将开始',
      body: '你好 {userName}，\n\n你报名的活动「{eventTitle}」将在明天开始！\n\n时间：{eventDate}\n地点：{eventLocation}\n\n期待见到你！\n\n— 串门儿团队',
    },
    {
      ruleId: 'P3-F',
      variantKey: 'default',
      subject: '【串门儿】好久不见，{userName}！',
      body: '你好 {userName}，\n\n我们发现你已经有一段时间没参加串门儿的活动了。\n\n最近有不少新活动，不如来看看？\n\n想你了，期待再次见到你！\n\n— 串门儿团队',
    },
    {
      ruleId: 'DIGEST',
      variantKey: 'default',
      subject: '{date} · 串门儿社区动态',
      body: '{digestContent}',
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.upsert({
      where: { ruleId_variantKey: { ruleId: t.ruleId, variantKey: t.variantKey } },
      update: {},
      create: {
        ruleId: t.ruleId,
        variantKey: t.variantKey,
        subject: t.subject,
        body: t.body,
        isActive: true,
      },
    });
  }
  console.log(`  ✅ EmailTemplates (${templates.length})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
