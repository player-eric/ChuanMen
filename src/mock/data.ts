import type {
  MemberData, EventData, PastEvent, Proposal,
  MoviePool, MovieScreened, CardReceived,
  FeedItem, MovieDetailData,
  BookPool, BookRead, BookDetailData,
} from '@/types';
import { photos } from '@/theme';

/* ═══════════════════════════════════════════════════════════
 * Title Definitions — stamp → title mapping
 * ═══════════════════════════════════════════════════════════ */
export interface TitleDefinition {
  id: string;
  emoji: string;
  name: string;
  description: string;
  stampEmoji: string;
  threshold: number;
}

export const titleDefinitions: TitleDefinition[] = [
  { id: 't-01', emoji: '🎬', name: '选片人', description: '累积获得 3 次 🎬 邮票', stampEmoji: '🎬', threshold: 3 },
  { id: 't-02', emoji: '🍳', name: '厨神', description: '累积获得 3 次 🍳 邮票', stampEmoji: '🍳', threshold: 3 },
  { id: 't-03', emoji: '🔥', name: '氛围担当', description: '累积获得 3 次 🔥 邮票', stampEmoji: '🔥', threshold: 3 },
  { id: 't-04', emoji: '🧊', name: '破冰王', description: '累积获得 3 次 🧊 邮票', stampEmoji: '🧊', threshold: 3 },
  { id: 't-05', emoji: '📸', name: '首席摄影', description: '累积获得 3 次 📸 邮票', stampEmoji: '📸', threshold: 3 },
  { id: 't-06', emoji: '☕', name: '暖心担当', description: '累积获得 3 次 ☕ 邮票', stampEmoji: '☕', threshold: 3 },
  { id: 't-07', emoji: '🏸', name: '运动达人', description: '累积获得 3 次 🏸 邮票', stampEmoji: '🏸', threshold: 3 },
  { id: 't-08', emoji: '❤️', name: '社区之心', description: '累积获得 3 次 ❤️ 邮票', stampEmoji: '❤️', threshold: 3 },
  { id: 't-09', emoji: '🧁', name: '甜品大师', description: '累积获得 3 次 🧁 邮票', stampEmoji: '🧁', threshold: 3 },
  { id: 't-10', emoji: '🥾', name: '户外达人', description: '累积获得 3 次 🥾 邮票', stampEmoji: '🥾', threshold: 3 },
  { id: 't-11', emoji: '⚡', name: '满满能量', description: '累积获得 3 次 ⚡ 邮票', stampEmoji: '⚡', threshold: 3 },
  { id: 't-12', emoji: '🎉', name: '气氛组长', description: '累积获得 3 次 🎉 邮票', stampEmoji: '🎉', threshold: 3 },
  { id: 't-13', emoji: '🏠', name: '最佳 Host', description: '累积获得 3 次 🏠 邮票', stampEmoji: '🏠', threshold: 3 },
  { id: 't-14', emoji: '💬', name: '话题王', description: '累积获得 3 次 💬 邮票', stampEmoji: '💬', threshold: 3 },
  { id: 't-15', emoji: '🎸', name: '音乐达人', description: '累积获得 3 次 🎸 邮票', stampEmoji: '🎸', threshold: 3 },
  { id: 't-16', emoji: '🧹', name: '收拾之神', description: '累积获得 3 次 🧹 邮票', stampEmoji: '🧹', threshold: 3 },
];

/* ═══════════════════════════════════════════════════════════
 * Task Presets — 按活动类型预设分工模板
 * ═══════════════════════════════════════════════════════════ */
export const taskPresets: Record<string, string[]> = {
  '电影夜': ['选片', '场地 & 设备', '零食 / 饮料', '拍照', '修图上传'],
  '茶话会/分享会': ['主题分享人', '场地', '拍照', '修图上传'],
  '户外':   ['路线规划', '开车', '拍照', '修图上传'],
  '运动':   ['场地预约', '拍照', '修图上传'],
};

/* ═══════════════════════════════════════════════════════════
 * Members — 12 members
 * ═══════════════════════════════════════════════════════════ */
export const membersData: MemberData[] = [
  {
    name: 'Yuan', role: 'admin', host: 6, badge: '🏠',
    titles: ['🎬 选片人', '🔥 氛围担当', '🏠 最佳 Host'],
    email: 'cm@gmail.com', location: 'Edison, NJ',
    bio: '串门儿的运营之一，平时喜欢看电影、做饭、在家招呼朋友。住在 Edison 快两年了，最近迷上了安哲罗普洛斯。',
    selfAsFriend: '话不多，但是在的时候你会觉得很安心。带吃的是基本操作。',
    idealFriend: '不用很外向，但要真诚。能一起安静看完一部电影的那种。',
    participationPlan: '继续做运营和 Host，希望串门儿能慢慢长大但不变质。',
    coverImageUrl: photos.cozy,
    mutual: { movies: ['花样年华', '春光乍泄', '惊魂记', '千与千寻'], events: ['02.22 电影夜', '02.08 电影夜', '01.25 新年饭局', '01.18 电影夜', '01.12 徒步', '01.05 Potluck'], evtCount: 18, cards: 8 },
  },
  {
    name: '白开水', role: 'host', host: 8, badge: '🏠',
    titles: ['🍳 厨神', '🔥 氛围担当', '🏠 最佳 Host', '🧹 收拾之神'],
    email: 'bks@example.com', location: 'Edison, NJ',
    bio: '喜欢在家里布置一个温暖的小影院，每次有朋友来都很开心。做饭是减压方式，擅长川菜和日料。',
    selfAsFriend: '靠谱，话不多但什么都愿意帮忙。你搬家我第一个到。',
    idealFriend: '真诚、不装、能一起安静待着的人。',
    participationPlan: '继续做 Host，希望每月至少一次电影夜。争取把地下室装修成真正的小影院。',
    coverImageUrl: photos.movieNight,
    mutual: { movies: ['花样年华', '春光乍泄', '惊魂记'], events: ['02.22 电影夜', '02.08 电影夜', '01.25 新年饭局', '01.18 电影夜', '01.05 Potluck'], evtCount: 12, cards: 5 },
  },
  {
    name: '大橙子', role: 'admin', host: 5, badge: '🏠',
    titles: ['📸 首席摄影', '⚡ 满满能量'],
    email: 'dachengzi@example.com', location: 'Jersey City, NJ',
    bio: '摄影爱好者，喜欢记录生活中的小确幸。在 JC 住了三年，周末常去 Hudson River 边拍照。',
    selfAsFriend: '热情、爱拍照、随叫随到。朋友圈里你的照片都是我拍的。',
    idealFriend: '有趣的灵魂，不用很外向。一起散步不说话也不尴尬。',
    participationPlan: '多拍照记录，当好活动摄影师。也想组织一次摄影主题的出游。',
    coverImageUrl: photos.hike,
    mutual: { movies: ['寄生虫', '燃烧女子的肖像', '重庆森林'], events: ['02.22 电影夜', '02.08 电影夜', '01.12 徒步'], evtCount: 8, cards: 3 },
  },
  {
    name: '星星', role: 'member', host: 0, titles: ['🧊 破冰王', '💬 话题王'],
    email: 'star@example.com', location: 'Princeton, NJ',
    bio: '社恐但是很想交朋友的矛盾体。在 Princeton 读研，研究方向是计算语言学。养了两只猫。',
    selfAsFriend: '慢热但一旦熟了话超多。记忆力很好，你说过的事我都记得。',
    idealFriend: '耐心、幽默、不嫌我话多。',
    participationPlan: '先参加活动认识大家，说不定哪天会鼓起勇气做一次 Host。',
    mutual: { movies: ['东京物语', '千与千寻'], events: ['02.22 电影夜', '02.08 电影夜'], evtCount: 5, cards: 3 },
  },
  {
    name: 'Tiffy', role: 'host', host: 3, badge: '🏠', titles: ['🍳 厨神', '🧁 甜品大师'],
    email: 'tiffy@example.com', location: 'Edison, NJ',
    bio: '做饭使我快乐，分享使我更快乐。上海人在新泽西，擅长本帮菜，也在学习意大利菜。梦想开一家小小的私房菜馆。',
    selfAsFriend: '爱做饭、爱分享、爱热闹。你来我家永远有饭吃。',
    idealFriend: '吃货，真诚，能一起探店。吃完还愿意帮忙洗碗的加分。',
    participationPlan: '多组织 Potluck，带大家吃好吃的。想尝试做一次烘焙主题聚会。',
    coverImageUrl: photos.potluck,
    mutual: { movies: ['花样年华', '千与千寻', '惊魂记'], events: ['02.22 电影夜', '02.08 电影夜', '01.25 新年饭局'], evtCount: 7, cards: 4 },
  },
  {
    name: '小鱼', role: 'member', host: 0, titles: [],
    email: 'xiaoyu@example.com', location: 'New Brunswick, NJ',
    bio: '刚来新泽西半年，在 Rutgers 读 MBA。还在适应美国生活，想认识更多朋友。',
    selfAsFriend: '安静、好相处、爱观察。带的零食永远比别人多。',
    idealFriend: '有生活经验、愿意分享的人。',
    participationPlan: '多参加活动，先认识大家。如果住的地方够大，也想试试做 Host。',
    mutual: { movies: [], events: ['02.08 电影夜', '01.12 徒步'], evtCount: 3, cards: 1 },
  },
  {
    name: 'Leo', role: 'member', host: 1, titles: ['🎬 选片人', '🏸 运动达人'],
    email: 'leo@example.com', location: 'Hoboken, NJ',
    bio: '电影发烧友，王家卫铁粉。在 Hoboken 一家投资公司工作。周末常去 Metrograph 看老片。',
    selfAsFriend: '话多、热情、喜欢安利电影。可以聊一整晚。',
    idealFriend: '对任何事物有热情的人，不一定要是电影。',
    participationPlan: '多推荐好电影，争取做一次电影主题的 Host。',
    mutual: { movies: ['重庆森林', '花样年华'], events: ['02.08 电影夜', '01.25 新年饭局'], evtCount: 4, cards: 1 },
  },
  {
    name: 'Mia', role: 'member', host: 0, titles: [],
    email: 'mia@example.com', location: 'Edison, NJ', hideEmail: true,
    bio: '第一次参加这种社群活动，有点紧张但很期待。在一家科技公司做产品经理。喜欢瑜伽和烘焙。',
    selfAsFriend: '温柔、细心、有点完美主义。',
    idealFriend: '善解人意、有正能量的人。',
    participationPlan: '先来看看，如果喜欢就多参加。',
    mutual: { movies: [], events: [], evtCount: 1, cards: 0 },
  },
  {
    name: '阿德', role: 'member', host: 2, badge: '🏠', titles: ['🎸 音乐达人', '🎉 气氛组长'],
    email: 'ade@example.com', location: 'Montclair, NJ',
    bio: '独立音乐人，在 Montclair 有一间小录音棚。吉他弹了十二年，最近在学习萨克斯。',
    selfAsFriend: '有点文艺、有点话痨、有点不着调。但朋友有事一定到。',
    idealFriend: '对生活有好奇心的人。',
    participationPlan: '想组织一次音乐分享会，带大家听听我最近在听的东西。',
    mutual: { movies: ['春光乍泄'], events: ['01.25 新年饭局', '01.05 Potluck'], evtCount: 3, cards: 2 },
  },
  {
    name: '奶茶', role: 'member', host: 0, titles: ['☕ 暖心担当', '❤️ 社区之心'],
    email: 'milktea@example.com', location: 'Fort Lee, NJ',
    bio: '在 Fort Lee 开了一家小奶茶店，每天被奶茶包围但还是喝不腻。大家来了请喝奶茶！',
    selfAsFriend: '开朗、大方、请客狂魔。',
    idealFriend: '不嫌弃我话多、不嫌弃我请客的人。',
    participationPlan: '多参加活动，带大家尝尝我调的新品。',
    mutual: { movies: ['寄生虫'], events: ['02.08 电影夜'], evtCount: 2, cards: 1 },
  },
  {
    name: 'Derek', role: 'member', host: 1, titles: ['🥾 户外达人', '🏸 运动达人'],
    email: 'derek@example.com', location: 'Ridgewood, NJ',
    bio: '户外运动爱好者，跑过三次马拉松。在 Ridgewood 住了五年，熟悉新泽西所有的 hiking trails。',
    selfAsFriend: '精力旺盛、组织力强、永远在路上。',
    idealFriend: '愿意一起走出舒适区的人。',
    participationPlan: '组织更多户外活动——徒步、皮划艇、露营都想试试。',
    mutual: { movies: [], events: ['01.12 徒步'], evtCount: 2, cards: 0 },
  },
  {
    name: '小樱', role: 'member', host: 0, titles: [],
    email: 'sakura@example.com', location: 'Princeton, NJ', hideEmail: true,
    bio: '日本文化爱好者，在 Princeton 做博后。喜欢动漫、日料和园艺。周末常去 Mitsuwa 买菜。',
    selfAsFriend: '安静、有耐心、喜欢倾听。',
    idealFriend: '有话聊又不累的人。',
    participationPlan: '想多认识朋友，如果有日料主题的活动一定参加。',
    mutual: { movies: ['千与千寻', '东京物语'], events: [], evtCount: 0, cards: 0 },
  },
];

/* ═══ Events — all 5 phases ═══ */
export const upcomingEvents: EventData[] = [
  {
    id: 'evt-1', title: '周六电影夜 · 花样年华', host: '白开水', date: '2.22 周六 7pm',
    endDate: '2.22 10pm', inviteDeadline: '2.21 6pm',
    location: 'Edison, NJ', locationPrivate: '123 Maple St, Edison, NJ 08820',
    isHomeEvent: true, scene: 'movieNight', film: '花样年华', spots: 4, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星'], phase: 'open',
    nominations: ['mov-1', 'mov-6', 'mov-3', 'mov-10'],
    desc: '王家卫经典。灯光调暗，坐在地下室沙发上，一起感受六十年代的香港。看完聊到十点，喝茶看星星。',
    houseRules: '请换鞋入内 · 10pm 前结束 · 可以带零食',
    tasks: [
      { role: '选片', name: 'Yuan' },
      { role: '场地 & 设备', name: '白开水' },
      { role: '零食', name: '星星' },
      { role: '带投影幕布' },
    ],
    comments: [
      { name: '星星', text: '好期待！花样年华是我最喜欢的电影之一', date: '02.20' },
      { name: '大橙子', text: '我带相机来拍几张现场照', date: '02.21' },
    ],
    photos: [
      { id: 'p-1-1', url: photos.movieNight, uploadedBy: '大橙子', caption: '布置现场中', createdAt: '02.22' },
      { id: 'p-1-2', url: photos.cozy, uploadedBy: '白开水', caption: '沙发区准备好了', createdAt: '02.22' },
    ],
  },
  {
    id: 'evt-2', title: 'Potluck · 来我家吃火锅', host: 'Tiffy', date: '2.28 周五 6pm',
    endDate: '2.28 10pm',
    location: 'Edison, NJ', locationPrivate: '456 Oak Ave, Edison, NJ 08820',
    isHomeEvent: true, scene: 'potluck', spots: 2, total: 8,
    people: ['Tiffy', '大橙子', '星星', 'Yuan', '小鱼', '奶茶'], phase: 'open',
    foodOption: 'potluck',
    desc: '铜锅涮肉！食材 AA，Tiffy 准备锅底和蘸料。请自带一道菜或甜点。',
    houseRules: '请自带一道菜 · 有猫，注意过敏 · 车可以停车库前面',
    tasks: [
      { role: '锅底 & 蘸料', name: 'Tiffy' },
      { role: '羊肉卷', name: 'Yuan' },
      { role: '蔬菜拼盘', name: '大橙子' },
      { role: '饮料' },
    ],
    comments: [
      { name: 'Yuan', text: '我带两盒羊肉卷！', date: '02.25' },
      { name: '奶茶', text: '可以带自制奶茶来配火锅吗？', date: '02.26' },
      { name: 'Tiffy', text: '当然可以！期待奶茶', date: '02.26' },
    ],
  },
  {
    id: 'evt-3', title: 'Spring Hike · Delaware Water Gap', host: '大橙子', date: '3.08 周六 9am',
    endDate: '3.08 4pm',
    location: 'Delaware Water Gap', scene: 'hike', spots: 6, total: 10,
    people: ['大橙子', 'Yuan', 'Derek', '阿德'], phase: 'invite', invitedBy: '大橙子',
    desc: '春季徒步，中等难度，来回大约 3 小时。拼车从 Jersey City 出发，也可以自驾。',
    tasks: [
      { role: '路线规划', name: 'Derek' },
      { role: '开车', name: '大橙子' },
      { role: '拍照' },
    ],
  },
  {
    id: 'evt-5', title: '周末电影夜 · 重庆森林', host: 'Leo', date: '3.15 周六 7pm',
    location: 'Hoboken, NJ', locationPrivate: '25 River St, Hoboken, NJ 07030',
    isHomeEvent: true, scene: 'movieNight', film: '重庆森林', spots: 5, total: 6,
    people: ['Leo'], phase: 'invite', invitedBy: 'Leo',
    nominations: ['mov-6', 'mov-1', 'mov-7'],
    desc: 'Leo 的第一次 Host！在 Hoboken 的公寓看王家卫的《重庆森林》。',
    houseRules: '有猫 · 楼下有街趴',
    tasks: [
      { role: '选片', name: 'Leo' },
      { role: '场地 & 设备', name: 'Leo' },
      { role: '零食 / 饮料' },
      { role: '拍照' },
    ],
  },
  {
    id: 'evt-6', title: '咖啡闲聊 · Montclair 小聚', host: '阿德', date: '3.01 周六 2pm',
    endDate: '3.01 5pm',
    location: 'Montclair, NJ', scene: 'coffee', spots: 3, total: 4,
    people: ['阿德'], phase: 'open',
    foodOption: 'eat_out', restaurantLocation: 'Watchung Booksellers Café, Montclair',
    desc: '不用主题、不用准备，就是坐下来喝杯咖啡聊聊天。',
    tasks: [
      { role: '选咖啡馆', name: '阿德' },
      { role: '拍照' },
    ],
  },
  {
    id: 'evt-7', title: '烘焙下午茶', host: 'Tiffy', date: '3.22 周六 2pm',
    endDate: '3.22 5pm',
    location: 'Edison, NJ', locationPrivate: '456 Oak Ave, Edison, NJ 08820',
    isHomeEvent: true, scene: 'potluck', spots: 4, total: 6,
    people: ['Tiffy', 'Mia'], phase: 'open',
    foodOption: 'host_cook',
    desc: 'Tiffy 教大家做司康和提拉米苏！食材全包，带着肚子来就好。',
    houseRules: '请自带围裙（如果有的话）· 有猫',
    tasks: [
      { role: '食材', name: 'Tiffy' },
      { role: '甜点教学', name: 'Tiffy' },
      { role: '饮料' },
      { role: '拍照' },
    ],
  },
  {
    id: 'evt-9', title: '周末电影夜 · 惊魂记', host: '白开水', date: '2.28 周五 7pm',
    endDate: '2.28 10pm',
    location: 'Edison, NJ', locationPrivate: '123 Maple St, Edison, NJ 08820',
    isHomeEvent: true, scene: 'movieNight', film: '惊魂记', spots: 0, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', '阿德'],
    phase: 'closed',
    nominations: ['mov-2', 'mov-5', 'mov-12', 'mov-8'],
    desc: '希区柯克经典惊悚片。报名已满，当天见！',
    houseRules: '请换鞋入内 · 10pm 前结束',
    tasks: [
      { role: '选片', name: 'Yuan' },
      { role: '场地 & 设备', name: '白开水' },
      { role: '零食 / 饮料', name: 'Tiffy' },
      { role: '拍照', name: '大橙子' },
    ],
  },
];

export const liveEvents: EventData[] = [];

export const endedEvents: EventData[] = [
  {
    id: 'evt-4', title: '周五电影夜 · 寄生虫', host: '白开水', date: '2.21 周五 7pm',
    endDate: '2.21 10pm',
    location: 'Edison, NJ', isHomeEvent: true, scene: 'movieNight', film: '寄生虫',
    spots: 0, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', 'Mia'],
    phase: 'ended',
    nominations: ['mov-13', 'mov-7', 'mov-10'],
    desc: '一起看奉俊昊的《寄生虫》，看完聊到十点多。',
    houseRules: '请换鞋入内 · 有零食和饮料',
    tasks: [
      { role: '选片', name: 'Yuan' },
      { role: '场地 & 设备', name: '白开水' },
      { role: '零食 / 饮料', name: '星星' },
      { role: '拍照', name: '大橙子' },
      { role: '修图上传', name: '大橙子' },
    ],
    photoCount: 12, commentCount: 5,
    photos: [
      { id: 'p-4-1', url: photos.movieNight, uploadedBy: '大橙子', caption: '投影效果超棒', createdAt: '02.21' },
      { id: 'p-4-2', url: photos.cozy, uploadedBy: '白开水', caption: '大家看得很投入', createdAt: '02.21' },
      { id: 'p-4-3', url: photos.potluck, uploadedBy: '星星', createdAt: '02.21' },
      { id: 'p-4-4', url: photos.coffee, uploadedBy: 'Tiffy', caption: '看完喝茶聊天', createdAt: '02.21' },
      { id: 'p-4-5', url: photos.nature, uploadedBy: '大橙子', caption: '白开水家院子', createdAt: '02.21' },
      { id: 'p-4-6', url: photos.hike, uploadedBy: 'Yuan', caption: '饭后散步', createdAt: '02.21' },
      { id: 'p-4-7', url: photos.sports, uploadedBy: 'Leo', caption: '合影留念', createdAt: '02.21' },
      { id: 'p-4-8', url: photos.movieNight, uploadedBy: 'Mia', caption: '第一次参加好开心', createdAt: '02.21' },
    ],
  },
  {
    id: 'evt-8', title: '日料之夜 · 手卷寿司', host: 'Yuan', date: '2.22 周六 6pm',
    endDate: '2.22 9pm',
    location: 'Edison, NJ', locationPrivate: '789 Elm St, Edison, NJ 08820',
    isHomeEvent: true, scene: 'potluck', spots: 0, total: 6,
    people: ['Yuan', '白开水', '小樱', '奶茶', 'Tiffy', '阿德'],
    phase: 'ended',
    foodOption: 'host_cook',
    desc: '大家一起动手做手卷寿司！Yuan 准备食材，小樱指导技术。吃完还有抹茶冰淇淋。',
    houseRules: '请换鞋入内 · 有猫 · 10pm 前收拾完',
    tasks: [
      { role: '食材', name: 'Yuan' },
      { role: '技术指导', name: '小樱' },
      { role: '饮料', name: '奶茶' },
      { role: '拍照', name: 'Tiffy' },
    ],
    photoCount: 8, commentCount: 3,
    photos: [
      { id: 'p-8-1', url: photos.potluck, uploadedBy: 'Tiffy', caption: '食材准备中', createdAt: '02.22' },
      { id: 'p-8-2', url: photos.cozy, uploadedBy: 'Yuan', caption: '手卷寿司成品', createdAt: '02.22' },
      { id: 'p-8-3', url: photos.coffee, uploadedBy: '白开水', caption: '大家一起动手', createdAt: '02.22' },
      { id: 'p-8-4', url: photos.nature, uploadedBy: '小樱', caption: '抹茶冰淇淋收尾', createdAt: '02.22' },
    ],
  },
  {
    id: 'evt-100', title: '打羽毛球', host: 'Derek', date: '2.15 周六 10am',
    location: 'Life Time Fitness, Bridgewater', scene: 'sports', spots: 0, total: 8,
    people: ['Derek', 'Leo', '大橙子', '白开水', '阿德', '小鱼'], phase: 'ended',
    desc: '在 Life Time 包了两个小时场地，单打双打都有。',
    tasks: [
      { role: '场地预约', name: 'Derek' },
      { role: '拍照', name: '大橙子' },
    ],
    photoCount: 5, commentCount: 2,
    photos: [
      { id: 'p-100-1', url: photos.sports, uploadedBy: 'Derek', caption: '热身中', createdAt: '02.15' },
      { id: 'p-100-2', url: photos.sports, uploadedBy: '大橙子', caption: '双打激战', createdAt: '02.15' },
      { id: 'p-100-3', url: photos.hike, uploadedBy: 'Leo', caption: '打完球合影', createdAt: '02.15' },
      { id: 'p-100-4', url: photos.nature, uploadedBy: '白开水', caption: '场地很不错', createdAt: '02.15' },
      { id: 'p-100-5', url: photos.coffee, uploadedBy: '阿德', caption: '赛后咖啡', createdAt: '02.15' },
    ],
  },
];

export const cancelledEvents: EventData[] = [
  {
    id: 'evt-101', title: '滑雪 · Mountain Creek', host: 'Derek', date: '2.09 周日 8am',
    location: 'Mountain Creek, Vernon', scene: 'hike', spots: 0, total: 6,
    people: ['Derek', 'Yuan', '大橙子'], phase: 'cancelled',
    desc: '下雨了，路面结冰不安全，取消。下次天气好再约！',
  },
];

export const proposals: Proposal[] = [
  {
    id: 'prop-1',
    name: 'Tiffy', title: '周末一起去爬 High Point？', votes: 5, interested: ['星星', '大橙子', '白开水', 'Derek'], time: '3 天前',
    descriptionHtml: '<p>新泽西最高点 <strong>High Point State Park</strong>，秋天去景色超美。</p><h3>计划</h3><ul><li>周六早上 9 点出发</li><li>大概 3 小时往返</li><li>难度不大，适合新手</li></ul><blockquote><p>山顶能同时看到三个州！纽约、宾州、新泽西尽收眼底。</p></blockquote><p>需要自备：登山鞋、水、零食。我可以准备一些三明治带上去。</p>',
    likes: 6, likedBy: ['星星', '大橙子', '白开水', 'Derek', 'Yuan', '小鱼'],
    comments: [
      { name: 'Derek', text: '强烈推荐！秋天去最美，山顶能看到三个州', date: '3 天前' },
      { name: '大橙子', text: '我可以开车，从 JC 出发的话能带三个人', date: '2 天前' },
      { name: '星星', text: '需要准备什么装备吗？我是新手', date: '1 天前' },
    ],
  },
  {
    id: 'prop-2',
    name: '星星', title: '找个周末一起去 MOMA？', votes: 3, interested: ['Yuan', 'Tiffy', 'Mia'], time: '5 天前',
    descriptionHtml: '<p>最近 MOMA 有个 <strong>安迪·沃霍尔</strong> 的特展，听说很值得看。</p><h3>行程安排</h3><ol><li>上午 11 点在 MOMA 门口集合</li><li>看展大概 2-3 小时</li><li>之后附近吃个 brunch</li></ol><p>门票大概 $25，学生有折扣。</p>',
    likes: 4, likedBy: ['Yuan', 'Tiffy', 'Mia', 'Leo'],
    comments: [
      { name: 'Yuan', text: '最近有个安迪·沃霍尔的展，很值得看', date: '4 天前' },
      { name: 'Mia', text: '我也想去！可以顺便在附近吃个 brunch', date: '3 天前' },
    ],
  },
  {
    id: 'prop-3',
    name: '小鱼', title: '有人想打羽毛球吗', votes: 8, interested: ['Leo', '大橙子', '白开水', 'Yuan', 'Derek', '阿德'], time: '1 周前',
    descriptionHtml: '<p>想组织一个 <strong>羽毛球</strong> 活动！不限水平，新手友好。</p><h3>场地</h3><ul><li><strong>Life Time Fitness</strong> — 上次去过，场地不错</li><li>也可以考虑 Rutgers 的室内场馆</li></ul><p>白开水说有多余球拍可以借，所以没装备也没关系～</p>',
    likes: 7, likedBy: ['Leo', '大橙子', '白开水', 'Yuan', 'Derek', '阿德', '星星'],
    comments: [
      { name: 'Derek', text: '上次 Life Time 的场地不错，可以再去', date: '6 天前' },
      { name: 'Leo', text: '我水平一般但很想参加！', date: '5 天前' },
      { name: '白开水', text: '我有多余的球拍可以借', date: '5 天前' },
      { name: '大橙子', text: '周六上午可以吗？下午我有事', date: '4 天前' },
    ],
  },
  {
    id: 'prop-4',
    name: 'Leo', title: '想搞一个外语电影马拉松，一晚看三部', votes: 6, interested: ['Yuan', '白开水', '星星', 'Leo'], time: '2 天前',
    descriptionHtml: '<h3>外语电影马拉松之夜</h3><p>一晚连续看 <strong>三部</strong> 外语片，中间吃点东西休息一下。</p><h3>主题备选</h3><ul><li>王家卫三连：花样年华 → 重庆森林 → 春光乍泄</li><li>法国新浪潮：四百击 → 筋疲力尽 → 祖与占</li><li>亚洲经典：东京物语 → 花样年华 → 寄生虫</li></ul><blockquote><p>白开水说可以提供场地和投影！</p></blockquote>',
    likes: 5, likedBy: ['Yuan', '白开水', '星星', '大橙子', 'Tiffy'],
    comments: [
      { name: 'Yuan', text: '太酷了！可以搞个主题，比如全是王家卫或者全是法国新浪潮', date: '2 天前' },
      { name: '白开水', text: '我家可以提供场地和投影，就是坐久了腰疼', date: '1 天前' },
    ],
  },
  {
    id: 'prop-5',
    name: '阿德', title: '来我录音棚体验录歌？', votes: 4, interested: ['奶茶', 'Tiffy', '星星'], time: '4 天前',
    descriptionHtml: '<p>我的小录音棚终于搭好了！想请大家来 <strong>体验录歌</strong>。</p><h3>可以做什么</h3><ul><li>唱任何歌（中文/英文/日文都行）</li><li>我可以现场 <strong>吉他伴奏</strong></li><li>录完可以带走音频文件</li></ul><p>不用唱得好，重在体验和开心！录音棚在 Edison，停车方便。</p>',
    likes: 5, likedBy: ['奶茶', 'Tiffy', '星星', 'Yuan', 'Leo'],
    comments: [
      { name: '奶茶', text: '我五音不全但是想体验一下哈哈', date: '3 天前' },
      { name: 'Tiffy', text: '可以唱什么类型的歌？有伴奏吗？', date: '2 天前' },
      { name: '阿德', text: '什么都可以唱！我可以现场吉他伴奏', date: '2 天前' },
    ],
  },
  {
    id: 'prop-6',
    name: '奶茶', title: '奶茶 tasting 大会！带大家试喝新品', votes: 7, interested: ['Tiffy', '小鱼', 'Mia', 'Yuan', '星星'], time: '1 天前',
    descriptionHtml: '<p>新品到了一批，想请大家来 <strong>盲测评分</strong>！</p><h3>活动流程</h3><ol><li>每人会拿到 5 杯不同的新品奶茶</li><li>盲测打分（1-10 分）</li><li>揭晓品牌和口味</li><li>票选最佳新品</li></ol><p>全程免费！地点在我家，空间够大。</p><blockquote><p>杨枝甘露是保留曲目，一定会有～</p></blockquote>',
    likes: 8, likedBy: ['Tiffy', '小鱼', 'Mia', 'Yuan', '星星', '白开水', 'Leo', '大橙子'],
    comments: [
      { name: 'Tiffy', text: '太期待了！你们家的杨枝甘露是我最爱', date: '1 天前' },
      { name: 'Yuan', text: '可以搞个盲测评分环节', date: '刚刚' },
    ],
  },
  {
    id: 'prop-7',
    name: 'Derek', title: '春天 kayaking，Raritan River', votes: 9, interested: ['大橙子', '阿德', '白开水', 'Yuan', 'Leo', 'Derek'], time: '6 天前',
    descriptionHtml: '<p>春天到了，一起去 <strong>Raritan River</strong> 划皮划艇吧！</p><h3>基本信息</h3><ul><li>地点：Raritan River，有 kayak rental</li><li>费用：大概 <strong>$40/人</strong>（租船 + 救生衣）</li><li>时长：全程大约 2-3 小时</li></ul><h3>注意事项</h3><ul><li>不会游泳也 OK，穿救生衣，河水很平缓</li><li>建议穿可以湿的衣服和鞋子</li><li>带防晒霜！</li></ul><blockquote><p>春天河两边的樱花应该很好看</p></blockquote>',
    likes: 9, likedBy: ['大橙子', '阿德', '白开水', 'Yuan', 'Leo', '小鱼', '星星', 'Tiffy', '奶茶'],
    comments: [
      { name: '大橙子', text: '需要自己带装备吗？还是可以租？', date: '5 天前' },
      { name: 'Derek', text: '可以租的，那边有个 kayak rental 大概 $40/人', date: '5 天前' },
      { name: '白开水', text: '我不会游泳也能参加吗？', date: '4 天前' },
      { name: 'Derek', text: '可以的！穿救生衣，河水很平缓', date: '4 天前' },
      { name: 'Yuan', text: '春天河两边的樱花应该很好看', date: '3 天前' },
    ],
  },
];

export const pastEvents: PastEvent[] = [
  { id: 'past-1', title: '电影夜 · 寄生虫', host: '白开水', date: '02.08', people: 8, scene: 'movieNight', film: '寄生虫', photoCount: 12, commentCount: 5 },
  { id: 'past-2', title: '新年饭局 Potluck', host: 'Yuan', date: '01.25', people: 10, scene: 'potluck', photoCount: 18, commentCount: 8 },
  { id: 'past-3', title: '电影夜 · 千与千寻', host: 'Yuan', date: '01.18', people: 7, scene: 'movieNight', film: '千与千寻', photoCount: 6, commentCount: 3 },
  { id: 'past-4', title: 'High Point 徒步', host: '大橙子', date: '01.12', people: 6, scene: 'hike', photoCount: 24, commentCount: 4 },
  { id: 'past-5', title: 'Potluck · 上海小笼', host: 'Tiffy', date: '01.05', people: 8, scene: 'potluck', photoCount: 15, commentCount: 7 },
  { id: 'past-6', title: '电影夜 · 春光乍泄', host: '白开水', date: '12.28', people: 6, scene: 'movieNight', film: '春光乍泄', photoCount: 8, commentCount: 4 },
  { id: 'past-7', title: '圣诞 Party', host: 'Yuan', date: '12.24', people: 12, scene: 'potluck', photoCount: 32, commentCount: 12 },
  { id: 'past-8', title: '电影夜 · 东京物语', host: 'Yuan', date: '12.15', people: 5, scene: 'movieNight', film: '东京物语', photoCount: 4, commentCount: 2 },
  { id: 'past-9', title: '感恩节 Potluck', host: '白开水', date: '11.28', people: 14, scene: 'potluck', photoCount: 28, commentCount: 10 },
  { id: 'past-10', title: 'Fall Hike · Watchung', host: 'Derek', date: '11.16', people: 8, scene: 'hike', photoCount: 20, commentCount: 6 },
  { id: 'past-11', title: '打羽毛球', host: 'Derek', date: '02.15', people: 6, scene: 'sports', photoCount: 5, commentCount: 2 },
  { id: 'past-12', title: '咖啡闲聊', host: '阿德', date: '02.01', people: 4, scene: 'coffee', photoCount: 3, commentCount: 1 },
];

/** ===== Movies ===== */
export const moviePool: MoviePool[] = [
  { id: 'mov-1', title: '花样年华', year: '2000', dir: '王家卫', v: 12, status: '本周放映', by: 'Yuan', voterIds: [] },
  { id: 'mov-2', title: '惊魂记', year: '1960', dir: '希区柯克', v: 9, by: '白开水', voterIds: [] },
  { id: 'mov-3', title: '永恒和一日', year: '1998', dir: '安哲罗普洛斯', v: 7, by: 'Yuan', voterIds: [] },
  { id: 'mov-4', title: '东京物语', year: '1953', dir: '小津安二郎', v: 6, by: '星星', voterIds: [] },
  { id: 'mov-5', title: '燃烧女子的肖像', year: '2019', dir: '瑟琳·席安玛', v: 5, by: 'Tiffy', voterIds: [] },
  { id: 'mov-6', title: '重庆森林', year: '1994', dir: '王家卫', v: 11, by: '大橙子', voterIds: [] },
  { id: 'mov-7', title: '小偷家族', year: '2018', dir: '是枝裕和', v: 8, by: '奶茶', voterIds: [] },
  { id: 'mov-8', title: '四百击', year: '1959', dir: '特吕弗', v: 4, by: 'Yuan', voterIds: [] },
  { id: 'mov-9', title: '红色沙漠', year: '1964', dir: '安东尼奥尼', v: 3, by: '白开水', voterIds: [] },
  { id: 'mov-10', title: '请以你的名字呼唤我', year: '2017', dir: '瓜达尼诺', v: 10, by: 'Derek', voterIds: [] },
  { id: 'mov-11', title: '秋刀鱼之味', year: '1962', dir: '小津安二郎', v: 6, by: '星星', voterIds: [] },
  { id: 'mov-12', title: '大佛普拉斯', year: '2017', dir: '黄信尧', v: 5, by: '阿德', voterIds: [] },
  { id: 'mov-13', title: '寄生虫', year: '2019', dir: '奉俊昊', v: 13, status: '已放映', by: '白开水', voterIds: [] },
  { id: 'mov-14', title: '千与千寻', year: '2001', dir: '宫崎骏', v: 10, status: '已放映', by: '星星', voterIds: [] },
  { id: 'mov-15', title: '春光乍泄', year: '1997', dir: '王家卫', v: 9, status: '已放映', by: 'Yuan', voterIds: [] },
  { id: 'mov-16', title: '坠落的审判', year: '2023', dir: '茹斯汀·特里耶', v: 8, status: '已放映', by: 'Leo', voterIds: [] },
  { id: 'mov-17', title: '完美的日子', year: '2023', dir: '维姆·文德斯', v: 6, status: '已放映', by: 'Yuan', voterIds: [] },
];

export const movieScreened: MovieScreened[] = [
  { title: '寄生虫', year: '2019', dir: '奉俊昊', date: '02.08', host: '白开水' },
  { title: '千与千寻', year: '2001', dir: '宫崎骏', date: '02.01', host: 'Yuan' },
  { title: '春光乍泄', year: '1997', dir: '王家卫', date: '01.25', host: '白开水' },
  { title: '东京物语', year: '1953', dir: '小津安二郎', date: '12.15', host: 'Yuan' },
  { title: '坠落的审判', year: '2023', dir: '茹斯汀·特里耶', date: '11.30', host: '星星' },
  { title: '完美的日子', year: '2023', dir: '维姆·文德斯', date: '11.10', host: 'Yuan' },
];

/** ===== Cards ===== */
export const cardPeople = [
  { name: '白开水', ctx: '电影夜 Host', badge: '🏠' },
  { name: '大橙子', ctx: '一起参加了电影夜' },
  { name: '星星', ctx: '第一次来串门' },
  { name: 'Tiffy', ctx: '一起参加了电影夜' },
  { name: '小鱼', ctx: '一起参加了 Potluck' },
  { name: 'Leo', ctx: '电影推荐达人', badge: '🎬' },
  { name: '阿德', ctx: '一起去了 High Point' },
  { name: '奶茶', ctx: '一起参加了打羽毛球' },
];

export const quickMessages = [
  '谢谢你的招待 🏠',
  '你做的菜太好吃了 🍳',
  '和你聊天很开心 💬',
  '下次还想见到你 👋',
  '你选的电影太好了 🎬',
  '这次徒步好开心 🥾',
];

export const myCards: CardReceived[] = [
  { from: '白开水', message: '谢谢你每次都把地下室收拾得像个小影院', stamp: '🎬', date: '02.08', photo: photos.movieNight, visibility: 'public' as const },
  { from: 'Tiffy', message: '氛围超棒，下次还来你家！', stamp: '🍳', date: '02.01', visibility: 'private' as const },
  { from: '大橙子', message: '你选的片子太好了', stamp: '🎬', date: '01.25', photo: photos.cozy, visibility: 'public' as const },
  { from: '星星', message: '第一次来就感觉像老朋友', stamp: '☕', date: '01.18', visibility: 'private' as const },
  { from: 'Leo', message: '你推荐的电影都好棒，品味一致', stamp: '🎬', date: '01.10', visibility: 'public' as const },
  { from: '小鱼', message: '和你打羽毛球好开心！', stamp: '🏸', date: '01.05', visibility: 'public' as const },
  { from: '阿德', message: '谢谢你带我融入这个社区', stamp: '❤️', date: '12.28', visibility: 'private' as const },
  { from: 'Mia', message: '你做的甜品太赞了', stamp: '🧁', date: '12.24', photo: photos.potluck, visibility: 'public' as const },
  { from: '奶茶', message: '下次一起再来你家看电影', stamp: '🎬', date: '12.15', visibility: 'private' as const },
  { from: 'Derek', message: '徒步那天太开心了，风景绝美', stamp: '🥾', date: '11.16', photo: photos.nature, visibility: 'public' as const },
];

export const cardsSent: CardReceived[] = [
  { from: 'Yuan', message: '谢谢白开水每次精心选片', stamp: '🎬', date: '02.08', visibility: 'public' as const },
  { from: 'Yuan', message: 'Tiffy 做的蛋糕太好吃了', stamp: '🧁', date: '02.01', visibility: 'public' as const },
  { from: 'Yuan', message: '大橙子你太有活力了', stamp: '⚡', date: '01.25', visibility: 'private' as const },
  { from: 'Yuan', message: '星星欢迎加入串门大家庭', stamp: '🎉', date: '01.18', visibility: 'public' as const },
  { from: 'Yuan', message: 'Derek 带路的徒步线路真棒', stamp: '🥾', date: '11.16', visibility: 'public' as const },
];

/** ===== Recommendations — 电影 / 菜谱 / 音乐 / 好店 ===== */
export interface RecoItem {
  _id: string;
  category: 'movie' | 'recipe' | 'music' | 'place';
  title: string;
  description: string;
  sourceUrl?: string;
  tags?: string[];
  voteCount: number;
  authorName: string;
  createdAt: string;
}

export const recommendationItems: RecoItem[] = [
  /* ── 电影 movie ── */
  { _id: 'reco-m1', category: 'movie', title: '花样年华', description: '王家卫 2000 年经典，梁朝伟张曼玉主演。暧昧、克制、旗袍和 Nat King Cole，每一帧都是画。', sourceUrl: 'https://movie.douban.com/subject/1291557/', tags: ['王家卫', '文艺', '爱情'], voteCount: 14, authorName: 'Yuan', createdAt: '2025-12-10' },
  { _id: 'reco-m2', category: 'movie', title: '重庆森林', description: '又一部王家卫，1994 年。快节奏拼贴两段都市爱情，凤梨罐头和加州之梦。适合和朋友看完讨论到深夜。', sourceUrl: 'https://movie.douban.com/subject/1291999/', tags: ['王家卫', '文艺', '香港'], voteCount: 11, authorName: '大橙子', createdAt: '2025-12-15' },
  { _id: 'reco-m3', category: 'movie', title: '寄生虫', description: '奉俊昊 2019 年金棕榈。穷人一家渗透进富人家庭，反转再反转。看完沉默五分钟。', sourceUrl: 'https://movie.douban.com/subject/27010768/', tags: ['韩国', '悬疑', '社会'], voteCount: 13, authorName: '白开水', createdAt: '2025-11-28' },
  { _id: 'reco-m4', category: 'movie', title: '千与千寻', description: '宫崎骏代表作，2001。少女千寻误入神灵世界的冒险。无论看多少遍都会哭。', sourceUrl: 'https://movie.douban.com/subject/1291561/', tags: ['动画', '宫崎骏', '奇幻'], voteCount: 10, authorName: '星星', createdAt: '2025-12-01' },
  { _id: 'reco-m5', category: 'movie', title: '燃烧女子的肖像', description: '瑟琳·席安玛 2019。18世纪法国小岛，画家与贵族小姐目光交汇。审美 ∞，看完沉浸式失恋。', sourceUrl: 'https://movie.douban.com/subject/30257175/', tags: ['法国', '爱情', '女性'], voteCount: 7, authorName: 'Tiffy', createdAt: '2026-01-05' },
  { _id: 'reco-m6', category: 'movie', title: '小偷家族', description: '是枝裕和 2018。东京底层"家族"相依为命的故事，温柔到令人心碎。', sourceUrl: 'https://movie.douban.com/subject/27622447/', tags: ['日本', '家庭', '温情'], voteCount: 9, authorName: '奶茶', createdAt: '2025-12-20' },
  { _id: 'reco-m7', category: 'movie', title: '坠落的审判', description: '茹斯汀·特里耶 2023 金棕榈。丈夫坠楼，妻子被审。真相在法庭与回忆之间反复横跳。', sourceUrl: 'https://movie.douban.com/subject/35942138/', tags: ['法国', '悬疑', '法庭'], voteCount: 8, authorName: 'Leo', createdAt: '2026-01-15' },
  { _id: 'reco-m8', category: 'movie', title: '完美的日子', description: '维姆·文德斯 2023。役所广司饰演东京公厕清洁工，每天重复的日常却自带诗意。', sourceUrl: 'https://movie.douban.com/subject/36151692/', tags: ['日本', '文艺', '日常'], voteCount: 6, authorName: 'Yuan', createdAt: '2026-01-20' },

  /* ── 菜谱 recipe ── */
  { _id: 'reco-r1', category: 'recipe', title: '红烧肉（本帮做法）', description: 'Tiffy 秘方，冰糖炒色、加黄酒慢炖两小时。肥而不腻，入口即化。Potluck 王牌菜。', sourceUrl: 'https://www.xiachufang.com/recipe/100416436/', tags: ['本帮菜', '硬菜', '下饭'], voteCount: 12, authorName: 'Tiffy', createdAt: '2025-12-05' },
  { _id: 'reco-r2', category: 'recipe', title: '酸菜鱼', description: '白开水的拿手菜。新鲜黑鱼片厚切，自家腌的酸菜，汤底酸辣鲜香。冬天来一锅巨舒服。', sourceUrl: 'https://www.xiachufang.com/recipe/104664725/', tags: ['川菜', '汤', '鱼'], voteCount: 10, authorName: '白开水', createdAt: '2025-11-20' },
  { _id: 'reco-r3', category: 'recipe', title: '日式咖喱饭', description: '小樱推荐的简单日式晚餐。洋葱炒到半透明是灵魂。加一块 Vermont Curry 咖喱块，配米饭绝了。', tags: ['日料', '简单', '下饭'], voteCount: 8, authorName: '小樱', createdAt: '2025-12-18' },
  { _id: 'reco-r4', category: 'recipe', title: '提拉米苏', description: 'Tiffy 烘焙课上教的版本。马斯卡彭 + 浓缩咖啡 + 手指饼干，冷藏一夜后口感最佳。', sourceUrl: 'https://www.xiachufang.com/recipe/103508518/', tags: ['甜品', '意式', '烘焙'], voteCount: 9, authorName: 'Tiffy', createdAt: '2026-01-10' },
  { _id: 'reco-r5', category: 'recipe', title: '葱油拌面', description: '十五分钟搞定的深夜食堂。小葱慢慢炸到金黄酥脆，浇在热面上再加一勺生抽。Yuan 的 go-to 懒人餐。', tags: ['面食', '快手', '上海'], voteCount: 11, authorName: 'Yuan', createdAt: '2025-12-25' },
  { _id: 'reco-r6', category: 'recipe', title: '手卷寿司', description: '上次日料之夜的明星菜！海苔 + 醋饭 + 新鲜刺身，diy 随意组合。小樱教的折法超简单。', tags: ['日料', '聚会', '互动'], voteCount: 7, authorName: '小樱', createdAt: '2026-02-01' },
  { _id: 'reco-r7', category: 'recipe', title: '麻婆豆腐', description: '正宗川味，花椒一定要用汉源的。嫩豆腐切块别搅碎，最后撒上一把葱花。白开水的下饭神器。', sourceUrl: 'https://www.xiachufang.com/recipe/102893598/', tags: ['川菜', '下饭', '豆腐'], voteCount: 8, authorName: '白开水', createdAt: '2026-01-08' },
  { _id: 'reco-r8', category: 'recipe', title: '司康 Scone', description: '英式下午茶标配。面团不要过度揉，保持粗糙感才会外酥内软。配草莓酱和 clotted cream。', tags: ['烘焙', '下午茶', '英式'], voteCount: 6, authorName: 'Tiffy', createdAt: '2026-02-10' },

  /* ── 音乐 music ── */
  { _id: 'reco-u1', category: 'music', title: 'Khruangbin — Con Todo El Mundo', description: '泰式放克 × 中东迷幻 × 得州吉他。适合做饭或开车时听，整张专辑零废曲。阿德电影夜前暖场必放。', sourceUrl: 'https://open.spotify.com/album/42j41uUwuHZT3bnklMGlPZ', tags: ['放克', '世界音乐', '氛围'], voteCount: 9, authorName: '阿德', createdAt: '2025-12-12' },
  { _id: 'reco-u2', category: 'music', title: '万能青年旅店 — 冀西南林路行', description: '等了十年的第二张。《泥河》《采石》，器乐编排太牛了。听完想辞职去旷野发呆。', sourceUrl: 'https://open.spotify.com/album/6wfKOYAHYjMqcVGqNljaMr', tags: ['摇滚', '国摇', '独立'], voteCount: 11, authorName: '阿德', createdAt: '2025-11-30' },
  { _id: 'reco-u3', category: 'music', title: 'Norah Jones — Come Away with Me', description: '经典爵士 vocal。适合雨天、适合读书、适合一个人喝红酒。奶茶店 BGM 常驻选手。', sourceUrl: 'https://open.spotify.com/album/1aBJp2ZBn3GlVgaFMJYafR', tags: ['爵士', '人声', '安静'], voteCount: 7, authorName: '奶茶', createdAt: '2026-01-02' },
  { _id: 'reco-u4', category: 'music', title: '椎名林檎 — 無罪モラトリアム', description: '日本摇滚女王出道专辑。《丸の内サディスティック》一首封神。嗓音太有辨识度了。', sourceUrl: 'https://open.spotify.com/album/59GRdGeBEGkzsvnhHCqo5x', tags: ['日摇', '另类', '女声'], voteCount: 8, authorName: '小樱', createdAt: '2025-12-22' },
  { _id: 'reco-u5', category: 'music', title: 'Radiohead — OK Computer', description: '1997 年神作。《Karma Police》《No Surprises》，整张专辑像一场关于科技异化的预言。', sourceUrl: 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE', tags: ['另类摇滚', '经典', '英摇'], voteCount: 10, authorName: 'Leo', createdAt: '2026-01-18' },
  { _id: 'reco-u6', category: 'music', title: '落日飞车 — Cassa Nova', description: '台湾 city pop / dream pop。《My Jinji》火遍全球不是没有道理的。夏天开车太爽了。', sourceUrl: 'https://open.spotify.com/album/4nLpuoCSeHHC7lkC8XVJWE', tags: ['dream pop', '台湾', '夏天'], voteCount: 8, authorName: '阿德', createdAt: '2026-02-05' },
  { _id: 'reco-u7', category: 'music', title: 'Yo-Yo Ma — Soul of the Tango', description: '马友友演绎皮亚佐拉探戈。大提琴的每一弓都在叹息。看王家卫电影前听超合适。', sourceUrl: 'https://open.spotify.com/album/2vEQwi4GnISdFm5KCHNOjK', tags: ['古典', '探戈', '大提琴'], voteCount: 6, authorName: 'Yuan', createdAt: '2025-12-28' },
  { _id: 'reco-u8', category: 'music', title: '陈绮贞 — 太阳', description: '吉他清新民谣。《旅行的意义》之外整张都好听。适合周末下午窝在沙发上听。', sourceUrl: 'https://open.spotify.com/album/1oIFkLDakYcwAH5UtCKhNM', tags: ['民谣', '台湾', '清新'], voteCount: 7, authorName: '星星', createdAt: '2026-01-25' },

  /* ── 好店 place ── */
  { _id: 'reco-p1', category: 'place', title: '鼎泰丰 Din Tai Fung（Flushing）', description: '法拉盛天景广场 B1。小笼包皮薄汁多，排骨炒饭也绝了。周末排队 40 分钟起，建议工作日去。', sourceUrl: 'https://www.dintaifungusa.com/us/locations.html', tags: ['中餐', '小笼包', '法拉盛'], voteCount: 13, authorName: '星星', createdAt: '2025-12-08' },
  { _id: 'reco-p2', category: 'place', title: 'Ramen Nagomi（Edison）', description: 'Edison 本地最佳拉面。豚骨浓厚，溏心蛋完美。老板是日本人，味道非常正宗。', tags: ['日料', '拉面', 'Edison'], voteCount: 10, authorName: '白开水', createdAt: '2025-11-25' },
  { _id: 'reco-p3', category: 'place', title: 'Mitsuwa Marketplace（Edgewater）', description: '新泽西最大的日系超市，吃的逛的都有。二楼美食广场推荐博多拉面和天妇罗。', sourceUrl: 'https://www.mitsuwa.com/stores/edgewater/', tags: ['超市', '日本', '逛街'], voteCount: 9, authorName: '小樱', createdAt: '2025-12-14' },
  { _id: 'reco-p4', category: 'place', title: 'Bread & Salt（Jersey City）', description: 'JC 的意大利面包房 / 比萨店。focaccia 是全纽约 / 新泽西最好吃的，没有之一。周末常卖光。', sourceUrl: 'https://www.breadandsaltbakery.com/', tags: ['面包', '意大利', 'JC'], voteCount: 11, authorName: '大橙子', createdAt: '2025-12-20' },
  { _id: 'reco-p5', category: 'place', title: 'Storm King Art Center', description: 'Hudson Valley 露天雕塑公园。秋天去最美，大草坪 + 巨型雕塑，拍照圣地。开车一小时左右。', sourceUrl: 'https://stormking.org/', tags: ['艺术', '户外', '拍照'], voteCount: 8, authorName: 'Tiffy', createdAt: '2026-01-12' },
  { _id: 'reco-p6', category: 'place', title: 'Cafe Peanut（Princeton）', description: 'Princeton 小镇上的独立咖啡馆。手冲豆子水准很高，空间安静适合工作。周末有 pastry 出炉。', tags: ['咖啡', 'Princeton', '安静'], voteCount: 6, authorName: '星星', createdAt: '2026-01-28' },
  { _id: 'reco-p7', category: 'place', title: '小肥羊 Happy Lamb（Edison）', description: 'Edison Route 27 上的火锅连锁。锅底比海底捞正宗，羊肉非常新鲜。四人以上去最划算。', tags: ['火锅', 'Edison', '聚餐'], voteCount: 10, authorName: 'Tiffy', createdAt: '2026-02-08' },
  { _id: 'reco-p8', category: 'place', title: 'Grounds for Sculpture（Hamilton）', description: '汉密尔顿雕塑花园，春夏超出片。买票后可以在园内餐厅吃法餐。适合一日游。', sourceUrl: 'https://www.groundsforsculpture.org/', tags: ['艺术', '花园', '约会'], voteCount: 7, authorName: '大橙子', createdAt: '2026-02-15' },
];

/** ===== Feed Items (timeline) ===== */
export const feedItems: FeedItem[] = [
  /* ── 今天 ── */
  { type: 'time', label: '今天' },
  {
    type: 'activity', name: '白开水', title: '周六电影夜 · 花样年华',
    date: '2.22 周六 7pm', location: 'Edison, NJ', spots: 4,
    people: ['白开水', 'Yuan', '大橙子', '星星'],
    film: '花样年华', scene: 'movieNight', navTarget: '/events/1',
    likes: 8, likedBy: ['Yuan', '星星', '大橙子', 'Tiffy', 'Leo', '奶茶', '小鱼', '阿德'],
    newComments: 2,
    comments: [
      { name: '星星', text: '好期待！花样年华是我最喜欢的电影之一', date: '02.20' },
      { name: '大橙子', text: '我带相机来拍几张现场照', date: '02.21' },
    ],
  },
  {
    type: 'card', from: '白开水', to: 'Yuan',
    message: '谢谢你每次都把地下室收拾得像个小影院',
    photo: photos.movieNight, navTarget: '/cards',
    likes: 6, likedBy: ['Yuan', '星星', 'Tiffy', 'Leo', '大橙子', '奶茶'],
    comments: [{ name: 'Yuan', text: '哈哈不客气！下次继续', date: '02.22' }],
  },
  {
    type: 'smallGroup', name: '星星', title: '本周小聚 · 散步聊天',
    date: '2.23 周日 3pm', location: 'Princeton, NJ', weekNumber: 12,
    people: ['星星', 'Yuan', '小鱼'], capacity: 6,
    description: '下午在 Princeton 校园散步聊天，走累了去喝咖啡。',
    isPrivate: false,
    likes: 4, likedBy: ['Yuan', '小鱼', 'Tiffy', '奶茶'],
    comments: [{ name: 'Yuan', text: '好期待！Princeton 的校园很美', date: '02.22' }],
  },

  {
    type: 'actionNotice', action: 'photo_upload', name: '大橙子',
    targetTitle: '周六电影夜 · 花样年华', detail: '3 张照片', time: '30 分钟前',
    photoUrls: [photos.movieNight, photos.coffee, photos.hike],
    navTarget: '/events/1',
    likes: 3, likedBy: ['Yuan', '星星', '白开水'], comments: [],
  },
  {
    type: 'actionNotice', action: 'event_join', name: 'Mia',
    targetTitle: '本周小聚 · 散步聊天', time: '2 小时前',
    navTarget: '/events/7',
    likes: 2, likedBy: ['星星', 'Yuan'], comments: [],
  },
  {
    type: 'commentNotice', name: 'Leo', text: '每次看完都想去兰桂坊',
    targetTitle: '重庆森林', targetType: 'movie', time: '1 小时前',
    navTarget: '/discover/movies/5',
    likes: 1, likedBy: ['大橙子'], comments: [],
  },

  /* ── 昨天 ── */
  { type: 'time', label: '昨天' },
  {
    type: 'activity', name: 'Leo', title: '周五 potluck 聚餐',
    date: '2.21 周五 6:30pm', location: 'New Brunswick, NJ', spots: 2,
    people: ['Leo', '小鱼', 'Derek', '奶茶', 'Tiffy', '大橙子'],
    scene: 'potluck', navTarget: '/events/2',
    likes: 5, likedBy: ['小鱼', 'Derek', '奶茶', 'Tiffy', '大橙子'],
    comments: [
      { name: '奶茶', text: 'Leo 做的菜太好吃了！', date: '02.21' },
      { name: 'Derek', text: '下次我带甜点', date: '02.21' },
    ],
  },
  {
    type: 'card', from: 'Tiffy', to: 'Leo',
    message: '你做的那道红烧肉太好吃了，下次教教我！', navTarget: '/cards',
    likes: 4, likedBy: ['Leo', '大橙子', '奶茶', '小鱼'], comments: [],
  },
  {
    type: 'actionNotice', action: 'movie_nominate', name: 'Leo',
    targetTitle: '周六电影夜 · 花样年华', detail: '重庆森林', time: '昨天',
    navTarget: '/discover/movies/5',
    likes: 2, likedBy: ['大橙子', 'Yuan'], comments: [],
  },

  /* ── 本周 ── */
  { type: 'time', label: '本周' },
  {
    type: 'activity', name: 'Yuan', title: '惊魂记观影会',
    date: '2.19 周三 8pm', location: '白开水家 · Edison, NJ', spots: 0,
    people: ['Yuan', '白开水', 'Tiffy', '星星', '大橙子', 'Leo', '阿德'],
    film: '惊魂记', navTarget: '/events/3',
    likes: 7, likedBy: ['白开水', 'Tiffy', '星星', '大橙子', 'Leo', '阿德', '小鱼'],
    comments: [
      { name: '白开水', text: '浴室那场戏的蒙太奇剪辑，六十多年了还是教科书', date: '02.19' },
      { name: 'Yuan', text: '冬天看恐怖片氛围绝了', date: '02.19' },
    ],
  },
  {
    type: 'smallGroup', name: 'Tiffy', title: '小聚 · 在家做饭吃',
    date: '2.20 周四 6pm', location: 'Edison, NJ', weekNumber: 11,
    people: ['Tiffy', '白开水', '奶茶', '星星'], capacity: 6,
    description: '做几道拿手菜，人少吃得舒服。',
    isHome: true, isPrivate: true,
    likes: 3, likedBy: ['白开水', '奶茶', '星星'],
    comments: [],
  },
  {
    type: 'movie', name: '大橙子', title: '重庆森林', year: '1994', dir: '王家卫', votes: 11,
    likes: 9, likedBy: ['Yuan', 'Leo', '白开水', '星星', 'Tiffy', '阿德', '奶茶', 'Derek', '小鱼'],
    newComments: 1,
    comments: [
      { name: '大橙子', text: 'California Dreamin 一响就绷不住', date: '02.18' },
      { name: 'Leo', text: '每次看完都想去兰桂坊', date: '02.19' },
    ],
  },
  {
    type: 'proposal', name: '奶茶', title: '奶茶 tasting 大会！带大家试喝新品',
    votes: 7, interested: ['Tiffy', '小鱼', 'Mia', 'Yuan', '星星'],
    likes: 5, likedBy: ['Tiffy', '小鱼', 'Mia', 'Yuan', '星星'],
    comments: [
      { name: 'Tiffy', text: '我要喝杨枝甘露！', date: '02.17' },
      { name: '小鱼', text: '可以去 Kung Fu Tea 吗', date: '02.17' },
      { name: '奶茶', text: '打算买十几种回来盲测打分', date: '02.18' },
    ],
  },
  {
    type: 'commentNotice', name: '奶茶', text: '打算买十几种回来盲测打分',
    targetTitle: '奶茶 tasting 大会！', targetType: 'proposal', time: '3 天前',
    likes: 2, likedBy: ['Tiffy', '小鱼'], comments: [],
  },
  {
    type: 'actionNotice', action: 'task_claim', name: '大橙子',
    targetTitle: '周六电影夜 · 花样年华', detail: '需要人帮忙带投影幕布', time: '4 天前',
    navTarget: '/events/1',
    likes: 3, likedBy: ['白开水', 'Yuan', '星星'], comments: [],
  },
  {
    type: 'activity', name: 'Derek', title: '周末 hiking · Watchung Reservation',
    date: '2.18 周二 10am', location: 'Mountainside, NJ', spots: 5,
    people: ['Derek', '阿德', '大橙子'],
    likes: 3, likedBy: ['阿德', '大橙子', 'Leo'], comments: [],
  },
  {
    type: 'movie', name: '星星', title: '燃烧女子的肖像', year: '2019', dir: '瑟琳·席安玛', votes: 9,
    likes: 7, likedBy: ['Yuan', 'Tiffy', '奶茶', 'Mia', '小樱', '白开水', '星星'],
    comments: [{ name: 'Tiffy', text: '最后一幕回头的镜头，看哭了', date: '02.16' }],
  },
  {
    type: 'book', name: '大橙子', title: '三体', year: '2008', author: '刘慈欣', votes: 12,
    likes: 10, likedBy: ['Yuan', 'Leo', '白开水', '星星', 'Tiffy', '阿德', 'Derek', '小鱼', '奶茶', '小樱'],
    comments: [
      { name: 'Leo', text: '读完仰望星空都会害怕', date: '02.17' },
      { name: '白开水', text: '中国科幻的骄傲', date: '02.18' },
    ],
  },
  {
    type: 'book', name: '奶茶', title: '月亮与六便士', year: '1919', author: '毛姆', votes: 8,
    likes: 6, likedBy: ['Yuan', '星星', 'Tiffy', '大橙子', '白开水', 'Leo'],
    comments: [
      { name: 'Yuan', text: '月亮和六便士都很重要啊', date: '02.16' },
    ],
  },
  {
    type: 'milestone', text: '串门儿 8 个月了！\n已举办 20 场活动，12 位成员', emoji: '🎂',
    likes: 12, likedBy: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', 'Leo', '阿德', '奶茶', 'Derek', '小鱼', 'Mia', '小樱'],
    comments: [
      { name: '白开水', text: '🎉 继续办下去！', date: '02.15' },
      { name: 'Yuan', text: '从 6 个人到 12 个人，越来越热闹了', date: '02.15' },
      { name: 'Tiffy', text: '认识大家真的太开心了', date: '02.15' },
    ],
  },

  /* ── 上周 ── */
  { type: 'time', label: '上周' },
  {
    type: 'activity', name: '星星', title: '周末咖啡品鉴 · 手冲入门',
    date: '2.15 周六 3pm', location: 'Café Bené · Edison, NJ', spots: 0,
    people: ['星星', 'Yuan', '奶茶', 'Mia'], scene: 'coffee', navTarget: '/events/4',
    likes: 4, likedBy: ['Yuan', '奶茶', 'Mia', '白开水'],
    comments: [{ name: '奶茶', text: '第一次喝到手冲的果酸味，惊艳', date: '02.15' }],
  },
  {
    type: 'proposal', name: 'Leo', title: '一起去看百老汇 Hamilton',
    votes: 6, interested: ['Yuan', '星星', 'Tiffy', '奶茶'],
    likes: 4, likedBy: ['Yuan', '星星', 'Tiffy', '奶茶'],
    comments: [{ name: 'Yuan', text: '可以团购票便宜很多', date: '02.14' }],
  },
  {
    type: 'actionNotice', action: 'event_join', name: '小鱼',
    targetTitle: '周末咖啡品鉴 · 手冲入门', time: '1 周前',
    navTarget: '/events/4',
    likes: 2, likedBy: ['星星', '奶茶'], comments: [],
  },
  {
    type: 'card', from: '大橙子', to: '星星',
    message: '谢谢你带的咖啡豆，回味了一整周', photo: photos.coffee, navTarget: '/cards',
    likes: 3, likedBy: ['星星', 'Yuan', '奶茶'], comments: [],
  },
  {
    type: 'compactBook', name: 'Yuan', title: '活着',
    year: '1993', author: '余华', votes: 11, time: '1 周前', navTarget: '/discover/books/101',
    likes: 7, likedBy: ['白开水', '星星', '大橙子', 'Leo', 'Tiffy', '阿德', '奶茶'],
    comments: [{ name: 'Yuan', text: '每次读都觉得自己的烦恼不算什么', date: '02.12' }],
  },
  {
    type: 'compactBook', name: '星星', title: '百年孤独',
    year: '1967', author: '马尔克斯', votes: 9, time: '1 周前', navTarget: '/discover/books/102',
    likes: 5, likedBy: ['Yuan', 'Leo', '大橙子', '白开水', '小樱'],
    comments: [{ name: 'Leo', text: '开头那句话是文学史上最伟大的开头之一', date: '02.11' }],
  },
  {
    type: 'compactBook', name: 'Leo', title: '挪威的森林',
    year: '1987', author: '村上春树', votes: 8, time: '1 周前', navTarget: '/discover/books/103',
    likes: 4, likedBy: ['Yuan', '小樱', '奶茶', '星星'], comments: [],
  },
  {
    type: 'compactSmallGroup', name: '阿德', title: '小聚 · 录音棚参观',
    date: '2.14 周五 7pm', location: 'Montclair, NJ', weekNumber: 10,
    people: ['阿德', 'Leo', '大橙子'], capacity: 4,
    time: '1 周前', isPrivate: false,
    likes: 5, likedBy: ['Leo', '大橙子', 'Yuan', '白开水', '星星'],
    comments: [{ name: 'Leo', text: '录音棚太酷了！', date: '02.14' }],
  },
  {
    type: 'compactMovie', name: 'Yuan', title: '永恒和一日',
    year: '1998', dir: '安哲罗普洛斯', votes: 7, time: '1 周前', navTarget: '/discover/movies/3',
    likes: 4, likedBy: ['白开水', '星星', '大橙子', 'Leo'],
    comments: [{ name: 'Yuan', text: '安哲的长镜头让人忘记时间的存在', date: '02.12' }],
  },
  {
    type: 'compactMovie', name: '奶茶', title: '小偷家族',
    year: '2018', dir: '是枝裕和', votes: 8, time: '1 周前', navTarget: '/discover/movies/7',
    likes: 5, likedBy: ['Yuan', '星星', 'Tiffy', '小鱼', '白开水'], comments: [],
  },
  {
    type: 'compactProposal', name: 'Derek', title: '春天 kayaking，Raritan River',
    votes: 9, interested: ['大橙子', '阿德', '白开水', 'Yuan', 'Leo', 'Derek'], time: '6 天前',
    likes: 6, likedBy: ['大橙子', '阿德', '白开水', 'Yuan', 'Leo', '小鱼'],
    comments: [
      { name: '阿德', text: '水温够了吗？', date: '02.12' },
      { name: 'Derek', text: '四月中应该就可以了', date: '02.12' },
    ],
  },
  {
    type: 'compactProposal', name: '小鱼', title: '有人想打羽毛球吗',
    votes: 8, interested: ['Leo', '大橙子', '白开水', 'Yuan', 'Derek', '阿德'], time: '1 周前',
    likes: 5, likedBy: ['Leo', '大橙子', '白开水', 'Derek', '阿德'], comments: [],
  },

  /* ── 更早 ── */
  { type: 'time', label: '更早' },
  {
    type: 'milestone', text: '欢迎 Mia 和小樱加入串门儿！\n我们现在有 12 位成员了', emoji: '🎉',
    likes: 10, likedBy: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', 'Leo', '阿德', '奶茶', 'Derek', '小鱼'],
    comments: [
      { name: '白开水', text: '欢迎欢迎！', date: '02.06' },
      { name: 'Mia', text: '谢谢大家！期待和大家一起玩', date: '02.06' },
    ],
  },
  {
    type: 'activity', name: '阿德', title: 'Delaware Water Gap 一日徒步',
    date: '2.8 周六 9am', location: 'Worthington State Forest, NJ', spots: 0,
    people: ['阿德', 'Derek', '大橙子', '白开水', 'Leo'], scene: 'hike', navTarget: '/events/5',
    likes: 6, likedBy: ['Derek', '大橙子', '白开水', 'Leo', 'Yuan', '星星'],
    comments: [
      { name: 'Derek', text: '风景太好了，下次要早点出发', date: '02.08' },
      { name: '大橙子', text: '照片已经发群里了', date: '02.08' },
    ],
  },
  {
    type: 'activity', name: '小鱼', title: '周末羽毛球 · Edison 体育馆',
    date: '2.2 周日 2pm', location: 'Edison, NJ', spots: 3,
    people: ['小鱼', 'Leo', '大橙子', 'Derek'], scene: 'sports',
    likes: 3, likedBy: ['Leo', '大橙子', 'Derek'],
    comments: [{ name: 'Leo', text: '下次得分组打比赛', date: '02.02' }],
  },
  {
    type: 'compactMovie', name: '星星', title: '千与千寻',
    year: '2001', dir: '宫崎骏', votes: 10, time: '3 周前', navTarget: '/discover/movies/8',
    likes: 8, likedBy: ['Yuan', '大橙子', 'Tiffy', '奶茶', 'Mia', '小樱', '白开水', 'Leo'],
    comments: [{ name: 'Mia', text: '小时候看的第一部宫崎骏', date: '01.30' }],
  },
  {
    type: 'compactMovie', name: 'Leo', title: '寄生虫',
    year: '2019', dir: '奉俊昊', votes: 9, time: '3 周前', navTarget: '/discover/movies/7',
    likes: 6, likedBy: ['Yuan', '白开水', '大橙子', '星星', 'Tiffy', '小鱼'], comments: [],
  },
  {
    type: 'actionNotice', action: 'photo_upload', name: 'Derek',
    targetTitle: 'Delaware Water Gap 一日徒步', detail: '5 张照片', time: '2 周前',
    photoUrls: [photos.hike, photos.nature, photos.sports],
    navTarget: '/events/5',
    likes: 4, likedBy: ['阿德', '大橙子', '白开水', 'Leo'], comments: [],
  },
  {
    type: 'card', from: 'Yuan', to: '阿德',
    message: '带我们走了那条超美的山路，腿虽然废了但值得', photo: photos.hike, navTarget: '/cards',
    likes: 5, likedBy: ['阿德', 'Derek', '大橙子', '白开水', 'Leo'],
    comments: [{ name: '阿德', text: '哈哈 下次走平路', date: '02.09' }],
  },
  {
    type: 'compactSmallGroup', name: 'Derek', title: '小聚 · 周末晨跑',
    date: '2.1 周六 7am', location: 'Ridgewood, NJ', weekNumber: 9,
    people: ['Derek', '阿德', 'Leo', '大橙子'], capacity: 6,
    time: '3 周前', isPrivate: false,
    likes: 4, likedBy: ['阿德', 'Leo', '大橙子', 'Yuan'],
    comments: [{ name: '阿德', text: '六点半集合太早了但值得', date: '02.01' }],
  },
  {
    type: 'compactProposal', name: 'Mia', title: '一起做陶艺吧',
    votes: 5, interested: ['星星', 'Tiffy', 'Yuan'], time: '2 周前',
    likes: 3, likedBy: ['星星', 'Tiffy', 'Yuan'], comments: [],
  },
  {
    type: 'compactProposal', name: '小樱', title: '组团去 Mitsuwa 日本超市采购',
    votes: 7, interested: ['奶茶', '小鱼', '星星', 'Mia', 'Yuan'], time: '3 周前',
    likes: 5, likedBy: ['奶茶', '小鱼', '星星', 'Mia', 'Yuan'],
    comments: [{ name: '奶茶', text: '我要买日式咖喱块！', date: '01.28' }],
  },
  {
    type: 'milestone', text: '第 15 场活动达成！\n从电影夜到 hiking，每次都是新体验', emoji: '🏆',
    likes: 11, likedBy: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', 'Leo', '阿德', '奶茶', 'Derek', '小鱼', 'Mia'],
    comments: [{ name: 'Leo', text: '下一个目标 50 场！', date: '01.25' }],
  },
  {
    type: 'activity', name: 'Mia', title: '植物园春日散步 · Rutgers Gardens',
    date: '1.25 周六 11am', location: 'New Brunswick, NJ', spots: 0,
    people: ['Mia', '小樱', '星星', '奶茶', 'Tiffy'], scene: 'nature', navTarget: '/events/6',
    likes: 5, likedBy: ['小樱', '星星', '奶茶', 'Tiffy', 'Yuan'],
    comments: [
      { name: '小樱', text: '春天花开了一定更美', date: '01.25' },
      { name: '星星', text: '拍了好多照片，回头发大家', date: '01.25' },
    ],
  },
  {
    type: 'movie', name: 'Tiffy', title: '请以你的名字呼唤我', year: '2017', dir: '卢卡·瓜达尼诺', votes: 8,
    likes: 6, likedBy: ['Yuan', '星星', '奶茶', 'Mia', '小樱', '大橙子'],
    comments: [
      { name: 'Yuan', text: '意大利的夏天太美了', date: '01.22' },
      { name: '星星', text: 'Sufjan Stevens 的配乐绝了', date: '01.23' },
    ],
  },
];

/** ===== Movie Detail Map ===== */
export const movieDetailMap: Record<string, MovieDetailData> = {
  'mov-1': {
    id: 'mov-1', title: '花样年华', year: '2000', dir: '王家卫', v: 12, by: 'Yuan',
    status: '本周放映', genre: '剧情 / 爱情', duration: '98 分钟', rating: '8.6',
    synopsis: '1962 年的香港，报社编辑周慕云与苏丽珍成为邻居。当他们发现各自的配偶背着他们有了婚外情后，两人开始互相接近，在克制与暧昧之间徘徊。王家卫用旗袍、昏暗走廊和 Nat King Cole 的歌声，编织了一个关于错过的爱情故事。',
    voters: ['Yuan', '白开水', '大橙子', '星星', 'Tiffy', 'Leo', '阿德', '奶茶', 'Derek', '小鱼', '小樱', 'Mia'],
    screenings: [
      { date: '02.22', host: '白开水', eventTitle: '周六电影夜 · 花样年华', eventId: 'evt-1' },
    ],
    comments: [
      { name: 'Yuan', text: '每次看都有新的感受，旗袍和配乐太绝了', date: '02.10' },
      { name: 'Leo', text: '王家卫最好的作品，没有之一', date: '02.12' },
      { name: '星星', text: '那种克制的美感，现代电影很少见了', date: '02.15' },
    ],
  },
  'mov-2': {
    id: 'mov-2', title: '惊魂记', year: '1960', dir: '希区柯克', v: 9, by: '白开水',
    genre: '悬疑 / 惊悚', duration: '109 分钟', rating: '8.9',
    synopsis: '玛丽恩携款潜逃，途中投宿于一家偏僻的汽车旅馆，旅馆主人诺曼·贝茨看似温和有礼，但在他和母亲的关系中隐藏着惊人的秘密。希区柯克颠覆叙事的杰作。',
    voters: ['白开水', 'Yuan', 'Tiffy', '星星', '大橙子', 'Leo', '阿德', '小鱼', 'Derek'],
    screenings: [],
    comments: [
      { name: '白开水', text: '浴室那场戏的蒙太奇剪辑，六十多年了还是教科书', date: '01.20' },
      { name: 'Yuan', text: '想在电影夜放，适合冬天的氛围', date: '01.22' },
    ],
  },
  'mov-3': {
    id: 'mov-3', title: '永恒和一日', year: '1998', dir: '安哲罗普洛斯', v: 7, by: 'Yuan',
    genre: '剧情', duration: '137 分钟', rating: '8.4',
    synopsis: '希腊诗人亚历山大生命的最后一天，他在街上捡到一个阿尔巴尼亚难民男孩，两人一起穿越塞萨洛尼基的冬日街道。关于时间、记忆和语言的沉思。',
    voters: ['Yuan', '白开水', '星星', '大橙子', 'Leo', '小樱', '阿德'],
    screenings: [],
    comments: [
      { name: 'Yuan', text: '安哲的长镜头让人忘记时间的存在', date: '02.01' },
    ],
  },
  'mov-6': {
    id: 'mov-6', title: '重庆森林', year: '1994', dir: '王家卫', v: 11, by: '大橙子',
    genre: '剧情 / 爱情', duration: '102 分钟', rating: '8.7',
    synopsis: '两段发生在重庆大厦和兰桂坊附近的都市爱情：失恋警察与神秘女杀手的一夜邂逅，以及另一个警察与快餐店女孩间的错过与重逢。王家卫用手持摄影和跳跃剪辑捕捉九十年代香港的孤独与浪漫。',
    voters: ['大橙子', 'Yuan', 'Leo', '白开水', '星星', 'Tiffy', '阿德', '奶茶', 'Derek', '小鱼', '小樱'],
    screenings: [
      { date: '03.15', host: 'Leo', eventTitle: '周末电影夜 · 重庆森林', eventId: 'evt-5' },
    ],
    comments: [
      { name: '大橙子', text: 'California Dreamin 一响就绷不住', date: '01.28' },
      { name: 'Leo', text: '每次看完都想去兰桂坊', date: '02.05' },
    ],
  },
  'mov-4': {
    id: 'mov-4', title: '东京物语', year: '1953', dir: '小津安二郎', v: 6, by: '星星',
    genre: '剧情 / 家庭', duration: '136 分钟', rating: '9.2',
    synopsis: '年迈的父母从乡下到东京探望已成家的子女，却发现孩子们各忙各的，无暇照顾他们。唯有守寡的儿媳纪子真心相待。小津用固定低角度镜头，温柔地讲述了家庭关系的疏离与无奈。',
    voters: ['星星', 'Yuan', '白开水', '小樱', '大橙子', 'Leo'],
    screenings: [
      { date: '12.15', host: 'Yuan', eventTitle: '电影夜 · 东京物语' },
    ],
    comments: [
      { name: '星星', text: '小津的电影越看越有味道，像清茶', date: '12.20' },
      { name: '小樱', text: '纪子太让人心疼了', date: '12.22' },
    ],
  },
  'mov-5': {
    id: 'mov-5', title: '燃烧女子的肖像', year: '2019', dir: '瑟琳·席安玛', v: 5, by: 'Tiffy',
    genre: '剧情 / 爱情', duration: '122 分钟', rating: '8.6',
    synopsis: '18世纪的法国，年轻女画家玛丽安受委托为富家小姐爱洛伊兹画肖像。在孤岛上相处的日子里，两人之间的目光渐渐化为爱意。席安玛用古典画般的构图和克制的情感，讲述了一段无法言说的爱情。',
    voters: ['Tiffy', '大橙子', 'Yuan', '星星', '小樱'],
    screenings: [],
    comments: [
      { name: 'Tiffy', text: '最后音乐会那场戏，看一次哭一次', date: '01.08' },
      { name: '大橙子', text: '每一帧都像油画', date: '01.10' },
    ],
  },
  'mov-7': {
    id: 'mov-7', title: '小偷家族', year: '2018', dir: '是枝裕和', v: 8, by: '奶茶',
    genre: '剧情 / 家庭', duration: '121 分钟', rating: '8.7',
    synopsis: '东京底层，一家人靠偷窃为生却相互依存。当他们捡回一个被虐待的小女孩后，这个"家族"的秘密开始逐渐浮出水面。是枝裕和用温柔的视角探讨了何为家庭。',
    voters: ['奶茶', 'Yuan', '白开水', '星星', 'Tiffy', '大橙子', '小樱', '小鱼'],
    screenings: [],
    comments: [
      { name: '奶茶', text: '海边那场戏，眼泪止不住', date: '01.15' },
    ],
  },
  'mov-8': {
    id: 'mov-8', title: '四百击', year: '1959', dir: '特吕弗', v: 4, by: 'Yuan',
    genre: '剧情', duration: '99 分钟', rating: '8.7',
    synopsis: '巴黎少年安托万在学校和家庭中都得不到理解，一次次逃学和叛逆之后被送进少管所。最后他逃向大海，回头望向镜头的定格画面成为影史经典。法国新浪潮的开山之作。',
    voters: ['Yuan', '白开水', 'Leo', '阿德'],
    screenings: [],
    comments: [
      { name: 'Yuan', text: '结尾那个长镜头追跑到海边，太自由了', date: '02.05' },
    ],
  },
  'mov-9': {
    id: 'mov-9', title: '红色沙漠', year: '1964', dir: '安东尼奥尼', v: 3, by: '白开水',
    genre: '剧情', duration: '117 分钟', rating: '8.1',
    synopsis: '工业城市拉文纳，朱莉安娜在灰色的工厂与污染的环境中挣扎于精神危机。安东尼奥尼第一部彩色电影，用色彩本身叙事——灰绿的工厂、刺目的红墙，表达了现代人的异化与焦虑。',
    voters: ['白开水', 'Yuan', 'Leo'],
    screenings: [],
    comments: [
      { name: '白开水', text: '安东尼奥尼的色彩运用太前卫了', date: '01.25' },
    ],
  },
  'mov-10': {
    id: 'mov-10', title: '请以你的名字呼唤我', year: '2017', dir: '瓜达尼诺', v: 10, by: 'Derek',
    genre: '剧情 / 爱情', duration: '132 分钟', rating: '8.9',
    synopsis: '1983年意大利北部的夏天，17岁的Elio在父亲的别墅中遇到了来访的美国学者Oliver。在阳光、杏树和古典音乐中，两人之间的吸引慢慢升温，成为一段刻骨铭心的初恋。',
    voters: ['Derek', 'Yuan', '大橙子', '星星', 'Tiffy', 'Leo', '奶茶', '小鱼', '小樱', '阿德'],
    screenings: [],
    comments: [
      { name: 'Derek', text: '结尾壁炉前那场戏，Timothée演得太好了', date: '01.30' },
      { name: '星星', text: '意大利的夏天好美', date: '02.02' },
    ],
  },
  'mov-11': {
    id: 'mov-11', title: '秋刀鱼之味', year: '1962', dir: '小津安二郎', v: 6, by: '星星',
    genre: '剧情 / 家庭', duration: '113 分钟', rating: '8.7',
    synopsis: '鳏居老人平山周平意识到该为女儿安排婚事了。在与老同学的聚会中，他看到了独身老师的孤独晚景，开始思考人生的寂寥。小津最后的作品，平静中满是哀愁。',
    voters: ['星星', 'Yuan', '小樱', '白开水', '大橙子', 'Leo'],
    screenings: [],
    comments: [
      { name: '星星', text: '小津的遗作，每个镜头都珍贵', date: '02.08' },
    ],
  },
  'mov-12': {
    id: 'mov-12', title: '大佛普拉斯', year: '2017', dir: '黄信尧', v: 5, by: '阿德',
    genre: '剧情 / 喜剧', duration: '104 分钟', rating: '8.4',
    synopsis: '在佛像工厂当夜班保安的菜脯，和拾荒的好友肚财偷看老板的行车记录仪，却意外发现了惊天秘密。黑白影像中的荒诞与心酸，台湾底层小人物的黑色幽默。',
    voters: ['阿德', 'Yuan', '白开水', 'Leo', '大橙子'],
    screenings: [],
    comments: [
      { name: '阿德', text: '配乐太绝了，黄信尧的旁白是神来之笔', date: '01.18' },
    ],
  },
  'mov-13': {
    id: 'mov-13', title: '寄生虫', year: '2019', dir: '奉俊昊', v: 13, by: '白开水',
    status: '已放映', genre: '剧情 / 惊悚', duration: '132 分钟', rating: '8.8',
    synopsis: '金家四口全是无业游民，一次偶然的机会让长子基宇进入朴社长的豪宅当家教。随后一家人逐一渗透进这个富裕家庭，直到一场意外揭开地下室的秘密。奉俊昊用黑色幽默与社会批判赢得金棕榈。',
    voters: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', 'Mia', '奶茶', '阿德', '小樱', 'Derek', '小鱼'],
    screenings: [
      { date: '02.08', host: '白开水', eventTitle: '电影夜 · 寄生虫' },
      { date: '02.21', host: '白开水', eventTitle: '周五电影夜 · 寄生虫', eventId: 'evt-4' },
    ],
    comments: [
      { name: '白开水', text: '地下室那段太窒息了', date: '02.09' },
      { name: 'Yuan', text: '奉俊昊对空间的运用是教科书级别的', date: '02.10' },
      { name: '大橙子', text: '看完沉默了好久', date: '02.10' },
    ],
  },
  'mov-14': {
    id: 'mov-14', title: '千与千寻', year: '2001', dir: '宫崎骏', v: 10, by: '星星',
    status: '已放映', genre: '动画 / 奇幻', duration: '125 分钟', rating: '9.4',
    synopsis: '少女千寻随父母误入神灵世界，父母因贪吃被变成猪。千寻在汤婆婆的澡堂中工作，结识了神秘少年白龙，在这个奇异的世界中找到了勇气和成长。宫崎骏最经典的作品。',
    voters: ['星星', 'Yuan', 'Tiffy', '小樱', '大橙子', '白开水', '小鱼', 'Mia', '奶茶', 'Leo'],
    screenings: [
      { date: '01.18', host: 'Yuan', eventTitle: '电影夜 · 千与千寻' },
    ],
    comments: [
      { name: '星星', text: '无论看多少遍都会哭', date: '01.19' },
      { name: 'Tiffy', text: '白龙出现的时候全场都在欢呼', date: '01.20' },
    ],
  },
  'mov-15': {
    id: 'mov-15', title: '春光乍泄', year: '1997', dir: '王家卫', v: 9, by: 'Yuan',
    status: '已放映', genre: '剧情 / 爱情', duration: '96 分钟', rating: '8.9',
    synopsis: '黎耀辉和何宝荣从香港到布宜诺斯艾利斯，在异国的颠沛流离中反复纠缠、分离、重逢。王家卫用手持摄影和探戈音乐，记录了一段灼热而绝望的爱情。',
    voters: ['Yuan', '白开水', '阿德', 'Leo', '大橙子', '星星', 'Tiffy', '小樱', 'Derek'],
    screenings: [
      { date: '12.28', host: '白开水', eventTitle: '电影夜 · 春光乍泄' },
    ],
    comments: [
      { name: 'Yuan', text: 'Happy Together 这首歌一响就绷不住', date: '12.29' },
      { name: '阿德', text: '布宜诺斯艾利斯拍得太美了', date: '12.30' },
    ],
  },
  'mov-16': {
    id: 'mov-16', title: '坠落的审判', year: '2023', dir: '茹斯汀·特里耶', v: 8, by: 'Leo',
    status: '已放映', genre: '剧情 / 悬疑', duration: '151 分钟', rating: '8.4',
    synopsis: '丈夫从阁楼坠亡，作家妻子成为嫌疑人。法庭上，婚姻中的每一个裂缝都被放大审视。真相在证词与回忆之间反复横跳，观众也在审判席上。',
    voters: ['Leo', 'Yuan', '白开水', '星星', '大橙子', 'Tiffy', '阿德', '小鱼'],
    screenings: [
      { date: '11.30', host: '星星', eventTitle: '电影夜 · 坠落的审判' },
    ],
    comments: [
      { name: 'Leo', text: '法庭戏的张力太强了', date: '12.01' },
    ],
  },
  'mov-17': {
    id: 'mov-17', title: '完美的日子', year: '2023', dir: '维姆·文德斯', v: 6, by: 'Yuan',
    status: '已放映', genre: '剧情', duration: '124 分钟', rating: '8.3',
    synopsis: '东京，平山每天清晨起床，去清扫公共厕所。他听磁带、读文库本、在树荫下吃三明治。每一天都一样，却每一天都不同。维姆·文德斯用诗意的日常，讲述了一种"完美"的生活方式。',
    voters: ['Yuan', '白开水', '星星', '小樱', 'Leo', '阿德'],
    screenings: [
      { date: '11.10', host: 'Yuan', eventTitle: '电影夜 · 完美的日子' },
    ],
    comments: [
      { name: 'Yuan', text: '役所广司的表演太动人了，不着一词', date: '11.11' },
    ],
  },
};

/** ===== Books ===== */
export const bookPool: BookPool[] = [
  { id: 'book-101', title: '活着', year: '1993', author: '余华', v: 11, by: 'Yuan' },
  { id: 'book-102', title: '百年孤独', year: '1967', author: '马尔克斯', v: 9, by: '星星' },
  { id: 'book-103', title: '挪威的森林', year: '1987', author: '村上春树', v: 8, by: 'Leo' },
  { id: 'book-104', title: '小王子', year: '1943', author: '圣埃克苏佩里', v: 10, status: '已读完', by: 'Tiffy' },
  { id: 'book-105', title: '红楼梦', year: '1791', author: '曹雪芹', v: 7, by: '白开水' },
  { id: 'book-106', title: '三体', year: '2008', author: '刘慈欣', v: 12, by: '大橙子' },
  { id: 'book-107', title: '围城', year: '1947', author: '钱钟书', v: 6, status: '已读完', by: 'Yuan' },
  { id: 'book-108', title: '月亮与六便士', year: '1919', author: '毛姆', v: 8, by: '奶茶' },
  { id: 'book-109', title: '人间失格', year: '1948', author: '太宰治', v: 5, by: '小樱' },
  { id: 'book-110', title: '解忧杂货店', year: '2012', author: '东野圭吾', v: 9, status: '已读完', by: '星星' },
];

export const bookRead: BookRead[] = [
  { title: '小王子', year: '1943', author: '圣埃克苏佩里', date: '02.10', host: 'Tiffy' },
  { title: '围城', year: '1947', author: '钱钟书', date: '01.20', host: 'Yuan' },
  { title: '解忧杂货店', year: '2012', author: '东野圭吾', date: '12.28', host: '星星' },
  { title: '活着', year: '1993', author: '余华', date: '11.15', host: 'Yuan' },
];

export const bookDetailMap: Record<string, BookDetailData> = {
  'book-101': {
    id: 'book-101', title: '活着', year: '1993', author: '余华', v: 11, by: 'Yuan',
    genre: '小说 / 现实主义', pages: '191 页', rating: '9.4',
    synopsis: '地主少爷福贵嗜赌成性，终于赌光了家业。穷困之中，福贵的亲人一个个离他而去，最终只剩老牛与他相依为命。余华用平淡的笔调写出了人生最大的苦难与坚韧。',
    voters: ['Yuan', '白开水', '星星', '大橙子', 'Tiffy', 'Leo', '阿德', '奶茶', 'Derek', '小鱼', '小樱'],
    discussions: [
      { date: '11.15', host: 'Yuan', eventTitle: '读书会 · 活着' },
    ],
    comments: [
      { name: 'Yuan', text: '每次读都觉得自己的烦恼不算什么', date: '02.10' },
      { name: '白开水', text: '余华写苦难的能力无人能及', date: '02.12' },
      { name: '星星', text: '看到有庆那段哭了好久', date: '02.15' },
    ],
  },
  'book-102': {
    id: 'book-102', title: '百年孤独', year: '1967', author: '马尔克斯', v: 9, by: '星星',
    genre: '小说 / 魔幻现实主义', pages: '360 页', rating: '9.2',
    synopsis: '布恩迪亚家族七代人的传奇故事，发生在虚构的马孔多镇。吉普赛人的魔法、失眠症瘟疫、漫天的黄蝴蝶……马尔克斯用华丽的想象力构建了一个关于孤独与宿命的世界。',
    voters: ['星星', 'Yuan', '白开水', 'Leo', '大橙子', '阿德', '小樱', '奶茶', 'Tiffy'],
    discussions: [],
    comments: [
      { name: '星星', text: '读了三遍才理清人物关系', date: '01.25' },
      { name: 'Leo', text: '开头那句话是文学史上最伟大的开头之一', date: '01.28' },
    ],
  },
  'book-103': {
    id: 'book-103', title: '挪威的森林', year: '1987', author: '村上春树', v: 8, by: 'Leo',
    genre: '小说 / 爱情', pages: '384 页', rating: '8.0',
    synopsis: '渡边彻在飞机上听到《挪威的森林》，回忆起大学时代与两个女孩的故事：直子安静而忧郁，绿子活泼而热烈。村上春树用淡淡的笔触写出了青春的迷惘与丧失。',
    voters: ['Leo', 'Yuan', '星星', '小樱', '奶茶', 'Tiffy', '大橙子', '白开水'],
    discussions: [],
    comments: [
      { name: 'Leo', text: '大学时读了好几遍，每次感受都不同', date: '02.01' },
      { name: '小樱', text: '村上的文字有一种独特的节奏感', date: '02.05' },
    ],
  },
  'book-104': {
    id: 'book-104', title: '小王子', year: '1943', author: '圣埃克苏佩里', v: 10, by: 'Tiffy',
    status: '已读完', genre: '童话 / 哲学', pages: '96 页', rating: '9.0',
    synopsis: '飞行员在撒哈拉沙漠遇到来自小行星B612的小王子。小王子讲述了他和玫瑰花的故事，以及在各个星球上遇到的奇怪大人。看似儿童故事，实则写给大人的寓言。',
    voters: ['Tiffy', 'Yuan', '星星', '小鱼', 'Mia', '奶茶', '大橙子', '白开水', '小樱', 'Leo'],
    discussions: [
      { date: '02.10', host: 'Tiffy', eventTitle: '读书会 · 小王子' },
    ],
    comments: [
      { name: 'Tiffy', text: '"真正重要的东西，用眼睛是看不见的"', date: '02.11' },
      { name: '星星', text: '每次读都有新的感触', date: '02.12' },
      { name: 'Mia', text: '小时候看不懂，长大了看哭了', date: '02.13' },
    ],
  },
  'book-105': {
    id: 'book-105', title: '红楼梦', year: '1791', author: '曹雪芹', v: 7, by: '白开水',
    genre: '古典小说', pages: '1200+ 页', rating: '9.6',
    synopsis: '贾宝玉与林黛玉、薛宝钗之间的爱情纠葛，贾府由盛而衰的命运。曹雪芹用百科全书式的笔触描绘了一个封建大家族的兴亡史，被誉为中国古典小说的巅峰之作。',
    voters: ['白开水', 'Yuan', '星星', '大橙子', 'Leo', '阿德', 'Tiffy'],
    discussions: [],
    comments: [
      { name: '白开水', text: '每个人物都写活了，越读越有味道', date: '01.18' },
      { name: 'Yuan', text: '读红楼梦需要一整个冬天', date: '01.20' },
    ],
  },
  'book-106': {
    id: 'book-106', title: '三体', year: '2008', author: '刘慈欣', v: 12, by: '大橙子',
    genre: '科幻', pages: '302 页（第一部）', rating: '8.8',
    synopsis: '文革中一次偶然的星际通讯引发了地球文明与三体文明的接触。面对远超人类的外星科技，人类将如何应对？刘慈欣用硬核科幻想象力构建了宏大的宇宙图景。',
    voters: ['大橙子', 'Yuan', '白开水', 'Leo', '星星', '阿德', 'Derek', '小鱼', '奶茶', '小樱', 'Tiffy', 'Mia'],
    discussions: [],
    comments: [
      { name: '大橙子', text: '黑暗森林法则太震撼了', date: '02.08' },
      { name: 'Leo', text: '读完仰望星空都会害怕', date: '02.10' },
      { name: '白开水', text: '中国科幻的骄傲', date: '02.12' },
    ],
  },
  'book-107': {
    id: 'book-107', title: '围城', year: '1947', author: '钱钟书', v: 6, by: 'Yuan',
    status: '已读完', genre: '小说 / 讽刺', pages: '359 页', rating: '8.9',
    synopsis: '方鸿渐留洋归来，带着一张假文凭闯荡社会。从上海到内地，从恋爱到婚姻，处处碰壁。钱钟书用机智幽默的语言，写出了知识分子的困境——城外的人想进去，城里的人想出来。',
    voters: ['Yuan', '白开水', '星星', 'Leo', '阿德', '大橙子'],
    discussions: [
      { date: '01.20', host: 'Yuan', eventTitle: '读书会 · 围城' },
    ],
    comments: [
      { name: 'Yuan', text: '每一句话都值得细细品味', date: '01.21' },
      { name: '白开水', text: '方鸿渐太真实了哈哈', date: '01.22' },
    ],
  },
  'book-108': {
    id: 'book-108', title: '月亮与六便士', year: '1919', author: '毛姆', v: 8, by: '奶茶',
    genre: '小说', pages: '280 页', rating: '9.0',
    synopsis: '伦敦证券经纪人斯特里克兰德突然抛妻弃子，跑到巴黎画画。他不在乎世俗的评价，不在乎贫困和疾病，只追逐心中的月亮。毛姆以高更为原型，写了一个关于理想与现实的故事。',
    voters: ['奶茶', 'Yuan', '星星', 'Tiffy', '大橙子', '白开水', 'Leo', '小鱼'],
    discussions: [],
    comments: [
      { name: '奶茶', text: '有时候我也想抛下一切去追梦', date: '02.05' },
      { name: 'Yuan', text: '但是月亮和六便士都很重要啊', date: '02.06' },
    ],
  },
  'book-109': {
    id: 'book-109', title: '人间失格', year: '1948', author: '太宰治', v: 5, by: '小樱',
    genre: '小说 / 自传', pages: '176 页', rating: '8.3',
    synopsis: '大庭叶藏从小就觉得自己不配做人。他用小丑般的行为隐藏真实的自己，在酒精和女人中沉沦。太宰治半自传式的遗作，写尽了一个灵魂对人世的恐惧与绝望。',
    voters: ['小樱', '星星', 'Leo', '阿德', '奶茶'],
    discussions: [],
    comments: [
      { name: '小樱', text: '太宰治把"不合群"写到了极致', date: '01.30' },
      { name: '星星', text: '读完心情很复杂', date: '02.01' },
    ],
  },
  'book-110': {
    id: 'book-110', title: '解忧杂货店', year: '2012', author: '东野圭吾', v: 9, by: '星星',
    status: '已读完', genre: '小说 / 奇幻', pages: '291 页', rating: '8.5',
    synopsis: '三个小偷躲进一家废弃的杂货店，发现这里有一个神奇的时空邮箱——过去的人写来的烦恼信会出现在牛奶箱里，而他们的回信会传回过去。东野圭吾用温暖的笔触编织了一个关于善意与命运的故事。',
    voters: ['星星', 'Yuan', 'Tiffy', '小樱', '奶茶', '小鱼', 'Mia', '白开水', '大橙子'],
    discussions: [
      { date: '12.28', host: '星星', eventTitle: '读书会 · 解忧杂货店' },
    ],
    comments: [
      { name: '星星', text: '每个故事都串联在一起的感觉太妙了', date: '12.29' },
      { name: 'Tiffy', text: '看完觉得世界还是温暖的', date: '12.30' },
      { name: 'Mia', text: '推荐给所有需要被治愈的人', date: '01.02' },
    ],
  },
};

/** ===== Feed ===== */
export const feedAnnouncements = [
  { id: 'ann-1', slug: 'spring-2025-recruit', title: '🎉 串门 2025 春季招新开始啦！', body: '欢迎推荐你身边有趣的朋友加入我们的社区。点击了解详情。', date: '02.15' },
  { id: 'ann-2', slug: 'community-guidelines-v2', title: '📋 社区公约更新', body: '我们更新了社区公约 v2.0，请大家查看。主要增加了关于活动取消政策的说明。', date: '02.01' },
  { id: 'ann-3', slug: 'host-training', title: '🏠 新 Host 培训', body: '想成为 Host？我们将在本月举办一次线上 Host 培训会。感兴趣请报名！', date: '01.20' },
];

export const feedNewRecos = [
  { id: 'reco-1', from: '星星', type: 'restaurant' as const, title: '推荐了一家餐厅：Flushing 的鼎泰丰', date: '02.14' },
  { id: 'reco-2', from: '白开水', type: 'movie' as const, title: '推荐了电影《坠落的审判》', date: '02.10' },
  { id: 'reco-3', from: 'Tiffy', type: 'place' as const, title: '推荐了好去处：Storm King Art Center', date: '02.05' },
];

export const feedNewCards = [
  { id: 'card-1', from: '白开水', msg: '你是最棒的 Host！', date: '02.08' },
  { id: 'card-2', from: 'Tiffy', msg: '氛围超棒，下次还来你家！', date: '02.01' },
  { id: 'card-3', from: '大橙子', msg: '你选的片子太好了', date: '01.25' },
];
