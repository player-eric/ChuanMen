import type {
  MemberData, EventData, PastEvent, Proposal,
  MoviePool, MovieScreened, CardReceived,
} from '@/types';
import { photos } from '@/theme';

/* ═══════════════════════════════════════════════════════════
 * Members — 12 members
 * ═══════════════════════════════════════════════════════════ */
export const membersData: MemberData[] = [
  {
    name: 'Yuan', role: '运营', host: 6, badge: '🏠',
    titles: ['🎬 选片人', '🔥 氛围担当'],
    email: 'cm@gmail.com', location: 'Edison, NJ',
    bio: '串门儿的运营之一，平时喜欢看电影、做饭、在家招呼朋友。住在 Edison 快两年了，最近迷上了安哲罗普洛斯。',
    selfAsFriend: '话不多，但是在的时候你会觉得很安心。带吃的是基本操作。',
    idealFriend: '不用很外向，但要真诚。能一起安静看完一部电影的那种。',
    participationPlan: '继续做运营和 Host，希望串门儿能慢慢长大但不变质。',
    coverImageUrl: photos.cozy,
    mutual: { movies: ['花样年华', '春光乍泄', '惊魂记', '千与千寻'], events: ['02.22 电影夜', '02.08 电影夜', '01.25 新年饭局', '01.18 电影夜', '01.12 徒步', '01.05 Potluck'], evtCount: 18, cards: 8 },
  },
  {
    name: '白开水', role: '核心 Host', host: 8, badge: '🏠',
    titles: ['🍳 厨神', '🔥 氛围担当'],
    email: 'bks@example.com', location: 'Edison, NJ',
    bio: '喜欢在家里布置一个温暖的小影院，每次有朋友来都很开心。做饭是减压方式，擅长川菜和日料。',
    selfAsFriend: '靠谱，话不多但什么都愿意帮忙。你搬家我第一个到。',
    idealFriend: '真诚、不装、能一起安静待着的人。',
    participationPlan: '继续做 Host，希望每月至少一次电影夜。争取把地下室装修成真正的小影院。',
    coverImageUrl: photos.movieNight,
    mutual: { movies: ['花样年华', '春光乍泄', '惊魂记'], events: ['02.22 电影夜', '02.08 电影夜', '01.25 新年饭局', '01.18 电影夜', '01.05 Potluck'], evtCount: 12, cards: 5 },
  },
  {
    name: '大橙子', role: '运营', host: 5, badge: '🏠',
    titles: ['📸 首席摄影'],
    email: 'dachengzi@example.com', location: 'Jersey City, NJ',
    bio: '摄影爱好者，喜欢记录生活中的小确幸。在 JC 住了三年，周末常去 Hudson River 边拍照。',
    selfAsFriend: '热情、爱拍照、随叫随到。朋友圈里你的照片都是我拍的。',
    idealFriend: '有趣的灵魂，不用很外向。一起散步不说话也不尴尬。',
    participationPlan: '多拍照记录，当好活动摄影师。也想组织一次摄影主题的出游。',
    coverImageUrl: photos.hike,
    mutual: { movies: ['寄生虫', '燃烧女子的肖像', '重庆森林'], events: ['02.22 电影夜', '02.08 电影夜', '01.12 徒步'], evtCount: 8, cards: 3 },
  },
  {
    name: '星星', role: '', host: 0, titles: ['🧊 破冰王'],
    email: 'star@example.com', location: 'Princeton, NJ',
    bio: '社恐但是很想交朋友的矛盾体。在 Princeton 读研，研究方向是计算语言学。养了两只猫。',
    selfAsFriend: '慢热但一旦熟了话超多。记忆力很好，你说过的事我都记得。',
    idealFriend: '耐心、幽默、不嫌我话多。',
    participationPlan: '先参加活动认识大家，说不定哪天会鼓起勇气做一次 Host。',
    mutual: { movies: ['东京物语', '千与千寻'], events: ['02.22 电影夜', '02.08 电影夜'], evtCount: 5, cards: 3 },
  },
  {
    name: 'Tiffy', role: '', host: 3, badge: '🏠', titles: ['🍳 厨神'],
    email: 'tiffy@example.com', location: 'Edison, NJ',
    bio: '做饭使我快乐，分享使我更快乐。上海人在新泽西，擅长本帮菜，也在学习意大利菜。梦想开一家小小的私房菜馆。',
    selfAsFriend: '爱做饭、爱分享、爱热闹。你来我家永远有饭吃。',
    idealFriend: '吃货，真诚，能一起探店。吃完还愿意帮忙洗碗的加分。',
    participationPlan: '多组织 Potluck，带大家吃好吃的。想尝试做一次烘焙主题聚会。',
    coverImageUrl: photos.potluck,
    mutual: { movies: ['花样年华', '千与千寻', '惊魂记'], events: ['02.22 电影夜', '02.08 电影夜', '01.25 新年饭局'], evtCount: 7, cards: 4 },
  },
  {
    name: '小鱼', role: '', host: 0, titles: [],
    email: 'xiaoyu@example.com', location: 'New Brunswick, NJ',
    bio: '刚来新泽西半年，在 Rutgers 读 MBA。还在适应美国生活，想认识更多朋友。',
    selfAsFriend: '安静、好相处、爱观察。带的零食永远比别人多。',
    idealFriend: '有生活经验、愿意分享的人。',
    participationPlan: '多参加活动，先认识大家。如果住的地方够大，也想试试做 Host。',
    mutual: { movies: [], events: ['02.08 电影夜', '01.12 徒步'], evtCount: 3, cards: 1 },
  },
  {
    name: 'Leo', role: '', host: 1, titles: ['🎬 影迷'],
    email: 'leo@example.com', location: 'Hoboken, NJ',
    bio: '电影发烧友，王家卫铁粉。在 Hoboken 一家投资公司工作。周末常去 Metrograph 看老片。',
    selfAsFriend: '话多、热情、喜欢安利电影。可以聊一整晚。',
    idealFriend: '对任何事物有热情的人，不一定要是电影。',
    participationPlan: '多推荐好电影，争取做一次电影主题的 Host。',
    mutual: { movies: ['重庆森林', '花样年华'], events: ['02.08 电影夜', '01.25 新年饭局'], evtCount: 4, cards: 1 },
  },
  {
    name: 'Mia', role: '新成员', host: 0, titles: [],
    email: 'mia@example.com', location: 'Edison, NJ', hideEmail: true,
    bio: '第一次参加这种社群活动，有点紧张但很期待。在一家科技公司做产品经理。喜欢瑜伽和烘焙。',
    selfAsFriend: '温柔、细心、有点完美主义。',
    idealFriend: '善解人意、有正能量的人。',
    participationPlan: '先来看看，如果喜欢就多参加。',
    mutual: { movies: [], events: [], evtCount: 1, cards: 0 },
  },
  {
    name: '阿德', role: '', host: 2, badge: '🏠', titles: ['🎸 音乐人'],
    email: 'ade@example.com', location: 'Montclair, NJ',
    bio: '独立音乐人，在 Montclair 有一间小录音棚。吉他弹了十二年，最近在学习萨克斯。',
    selfAsFriend: '有点文艺、有点话痨、有点不着调。但朋友有事一定到。',
    idealFriend: '对生活有好奇心的人。',
    participationPlan: '想组织一次音乐分享会，带大家听听我最近在听的东西。',
    mutual: { movies: ['春光乍泄'], events: ['01.25 新年饭局', '01.05 Potluck'], evtCount: 3, cards: 2 },
  },
  {
    name: '奶茶', role: '', host: 0, titles: ['☕ 奶茶专家'],
    email: 'milktea@example.com', location: 'Fort Lee, NJ',
    bio: '在 Fort Lee 开了一家小奶茶店，每天被奶茶包围但还是喝不腻。大家来了请喝奶茶！',
    selfAsFriend: '开朗、大方、请客狂魔。',
    idealFriend: '不嫌弃我话多、不嫌弃我请客的人。',
    participationPlan: '多参加活动，带大家尝尝我调的新品。',
    mutual: { movies: ['寄生虫'], events: ['02.08 电影夜'], evtCount: 2, cards: 1 },
  },
  {
    name: 'Derek', role: '', host: 1, titles: ['🥾 户外达人'],
    email: 'derek@example.com', location: 'Ridgewood, NJ',
    bio: '户外运动爱好者，跑过三次马拉松。在 Ridgewood 住了五年，熟悉新泽西所有的 hiking trails。',
    selfAsFriend: '精力旺盛、组织力强、永远在路上。',
    idealFriend: '愿意一起走出舒适区的人。',
    participationPlan: '组织更多户外活动——徒步、皮划艇、露营都想试试。',
    mutual: { movies: [], events: ['01.12 徒步'], evtCount: 2, cards: 0 },
  },
  {
    name: '小樱', role: '新成员', host: 0, titles: [],
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
    id: 1, title: '周六电影夜 · 花样年华', host: '白开水', date: '2.22 周六 7pm',
    endDate: '2.22 10pm', inviteDeadline: '2.21 6pm',
    location: 'Edison, NJ', locationPrivate: '123 Maple St, Edison, NJ 08820',
    isHomeEvent: true, scene: 'movieNight', film: '花样年华', spots: 4, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星'], phase: 'open',
    desc: '王家卫经典。灯光调暗，坐在地下室沙发上，一起感受六十年代的香港。看完聊到十点，喝茶看星星。',
    houseRules: '请换鞋入内 · 10pm 前结束 · 可以带零食',
  },
  {
    id: 2, title: 'Potluck · 来我家吃火锅', host: 'Tiffy', date: '2.28 周五 6pm',
    endDate: '2.28 10pm',
    location: 'Edison, NJ', locationPrivate: '456 Oak Ave, Edison, NJ 08820',
    isHomeEvent: true, scene: 'potluck', spots: 2, total: 8,
    people: ['Tiffy', '大橙子', '星星', 'Yuan', '小鱼', '奶茶'], phase: 'open',
    desc: '铜锅涮肉！食材 AA，Tiffy 准备锅底和蘸料。请自带一道菜或甜点。',
    houseRules: '请自带一道菜 · 有猫，注意过敏 · 车可以停车库前面',
  },
  {
    id: 3, title: 'Spring Hike · Delaware Water Gap', host: '大橙子', date: '3.08 周六 9am',
    endDate: '3.08 4pm',
    location: 'Delaware Water Gap', scene: 'hike', spots: 6, total: 10,
    people: ['大橙子', 'Yuan', 'Derek', '阿德'], phase: 'invite', invitedBy: '大橙子',
    desc: '春季徒步，中等难度，来回大约 3 小时。拼车从 Jersey City 出发，也可以自驾。',
  },
  {
    id: 5, title: '周末电影夜 · 重庆森林', host: 'Leo', date: '3.15 周六 7pm',
    location: 'Hoboken, NJ', locationPrivate: '25 River St, Hoboken, NJ 07030',
    isHomeEvent: true, scene: 'movieNight', film: '重庆森林', spots: 5, total: 6,
    people: ['Leo'], phase: 'invite', invitedBy: 'Leo',
    desc: 'Leo 的第一次 Host！在 Hoboken 的公寓看王家卫的《重庆森林》。',
    houseRules: '有猫 · 楼下有街趴',
  },
  {
    id: 6, title: '咖啡闲聊 · Montclair 小聚', host: '阿德', date: '3.01 周六 2pm',
    endDate: '3.01 5pm',
    location: 'Montclair, NJ', scene: 'coffee', spots: 3, total: 4,
    people: ['阿德'], phase: 'open',
    desc: '不用主题、不用准备，就是坐下来喝杯咖啡聊聊天。',
  },
  {
    id: 7, title: '烘焙下午茶', host: 'Tiffy', date: '3.22 周六 2pm',
    endDate: '3.22 5pm',
    location: 'Edison, NJ', locationPrivate: '456 Oak Ave, Edison, NJ 08820',
    isHomeEvent: true, scene: 'potluck', spots: 4, total: 6,
    people: ['Tiffy', 'Mia'], phase: 'open',
    desc: 'Tiffy 教大家做司康和提拉米苏！食材全包，带着肚子来就好。',
    houseRules: '请自带围裙（如果有的话）· 有猫',
  },
];

export const liveEvents: EventData[] = [
  {
    id: 4, title: '周五电影夜 · 寄生虫', host: '白开水', date: '2.21 周五 7pm',
    endDate: '2.21 10pm',
    location: 'Edison, NJ', isHomeEvent: true, scene: 'movieNight', film: '寄生虫',
    spots: 0, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', 'Mia'],
    phase: 'live',
    desc: '正在进行中的电影夜，一起看奉俊昊的《寄生虫》。',
    houseRules: '请换鞋入内 · 有零食和饮料',
  },
  {
    id: 8, title: '日料之夜 · 手卷寿司', host: 'Yuan', date: '2.22 周六 6pm',
    endDate: '2.22 9pm',
    location: 'Edison, NJ', locationPrivate: '789 Elm St, Edison, NJ 08820',
    isHomeEvent: true, scene: 'potluck', spots: 0, total: 6,
    people: ['Yuan', '白开水', '小樱', '奶茶', 'Tiffy', '阿德'],
    phase: 'live',
    desc: '大家一起动手做手卷寿司！Yuan 准备食材，小樱指导技术。吃完还有抹茶冰淇淋。',
    houseRules: '请换鞋入内 · 有猫 · 10pm 前收拾完',
  },
];

export const endedEvents: EventData[] = [
  {
    id: 100, title: '打羽毛球', host: 'Derek', date: '2.15 周六 10am',
    location: 'Life Time Fitness, Bridgewater', scene: 'sports', spots: 0, total: 8,
    people: ['Derek', 'Leo', '大橙子', '白开水', '阿德', '小鱼'], phase: 'ended',
    desc: '在 Life Time 包了两个小时场地，单打双打都有。',
  },
];

export const cancelledEvents: EventData[] = [
  {
    id: 101, title: '滑雪 · Mountain Creek', host: 'Derek', date: '2.09 周日 8am',
    location: 'Mountain Creek, Vernon', scene: 'hike', spots: 0, total: 6,
    people: ['Derek', 'Yuan', '大橙子'], phase: 'cancelled',
    desc: '下雨了，路面结冰不安全，取消。下次天气好再约！',
  },
];

export const proposals: Proposal[] = [
  { name: 'Tiffy', title: '周末一起去爬 High Point？', votes: 5, interested: ['星星', '大橙子', '白开水', 'Derek'], time: '3 天前' },
  { name: '星星', title: '找个周末一起去 MOMA？', votes: 3, interested: ['Yuan', 'Tiffy', 'Mia'], time: '5 天前' },
  { name: '小鱼', title: '有人想打羽毛球吗', votes: 8, interested: ['Leo', '大橙子', '白开水', 'Yuan', 'Derek', '阿德'], time: '1 周前' },
  { name: 'Leo', title: '想搞一个外语电影马拉松，一晚看三部', votes: 6, interested: ['Yuan', '白开水', '星星', 'Leo'], time: '2 天前' },
  { name: '阿德', title: '来我录音棚体验录歌？', votes: 4, interested: ['奶茶', 'Tiffy', '星星'], time: '4 天前' },
  { name: '奶茶', title: '奶茶 tasting 大会！带大家试喝新品', votes: 7, interested: ['Tiffy', '小鱼', 'Mia', 'Yuan', '星星'], time: '1 天前' },
  { name: 'Derek', title: '春天 kayaking，Raritan River', votes: 9, interested: ['大橙子', '阿德', '白开水', 'Yuan', 'Leo', 'Derek'], time: '6 天前' },
];

export const pastEvents: PastEvent[] = [
  { title: '电影夜 · 寄生虫', host: '白开水', date: '02.08', people: 8, scene: 'movieNight', film: '寄生虫', photoCount: 12, commentCount: 5 },
  { title: '新年饭局 Potluck', host: 'Yuan', date: '01.25', people: 10, scene: 'potluck', photoCount: 18, commentCount: 8 },
  { title: '电影夜 · 千与千寻', host: 'Yuan', date: '01.18', people: 7, scene: 'movieNight', film: '千与千寻', photoCount: 6, commentCount: 3 },
  { title: 'High Point 徒步', host: '大橙子', date: '01.12', people: 6, scene: 'hike', photoCount: 24, commentCount: 4 },
  { title: 'Potluck · 上海小笼', host: 'Tiffy', date: '01.05', people: 8, scene: 'potluck', photoCount: 15, commentCount: 7 },
  { title: '电影夜 · 春光乍泄', host: '白开水', date: '12.28', people: 6, scene: 'movieNight', film: '春光乍泄', photoCount: 8, commentCount: 4 },
  { title: '圣诞 Party', host: 'Yuan', date: '12.24', people: 12, scene: 'potluck', photoCount: 32, commentCount: 12 },
  { title: '电影夜 · 东京物语', host: 'Yuan', date: '12.15', people: 5, scene: 'movieNight', film: '东京物语', photoCount: 4, commentCount: 2 },
  { title: '感恩节 Potluck', host: '白开水', date: '11.28', people: 14, scene: 'potluck', photoCount: 28, commentCount: 10 },
  { title: 'Fall Hike · Watchung', host: 'Derek', date: '11.16', people: 8, scene: 'hike', photoCount: 20, commentCount: 6 },
  { title: '打羽毛球', host: 'Derek', date: '02.15', people: 6, scene: 'sports', photoCount: 5, commentCount: 2 },
  { title: '咖啡闲聊', host: '阿德', date: '02.01', people: 4, scene: 'coffee', photoCount: 3, commentCount: 1 },
];

/** ===== Movies ===== */
export const moviePool: MoviePool[] = [
  { id: 1, title: '花样年华', year: '2000', dir: '王家卫', v: 12, status: '本周放映', by: 'Yuan' },
  { id: 2, title: '惊魂记', year: '1960', dir: '希区柯克', v: 9, by: '白开水' },
  { id: 3, title: '永恒和一日', year: '1998', dir: '安哲罗普洛斯', v: 7, by: 'Yuan' },
  { id: 4, title: '东京物语', year: '1953', dir: '小津安二郎', v: 6, by: '星星' },
  { id: 5, title: '燃烧女子的肖像', year: '2019', dir: '瑟琳·席安玛', v: 5, by: 'Tiffy' },
  { id: 6, title: '重庆森林', year: '1994', dir: '王家卫', v: 11, by: '大橙子' },
  { id: 7, title: '小偷家族', year: '2018', dir: '是枝裕和', v: 8, by: '奶茶' },
  { id: 8, title: '四百击', year: '1959', dir: '特吕弗', v: 4, by: 'Yuan' },
  { id: 9, title: '红色沙漠', year: '1964', dir: '安东尼奥尼', v: 3, by: '白开水' },
  { id: 10, title: '请以你的名字呼唤我', year: '2017', dir: '瓜达尼诺', v: 10, by: 'Derek' },
  { id: 11, title: '秋刀鱼之味', year: '1962', dir: '小津安二郎', v: 6, by: '星星' },
  { id: 12, title: '大佛普拉斯', year: '2017', dir: '黄信尧', v: 5, by: '阿德' },
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
  { from: '白开水', msg: '谢谢你每次都把地下室收拾得像个小影院', stamp: '🎬', date: '02.08', photo: photos.movieNight, priv: false },
  { from: 'Tiffy', msg: '氛围超棒，下次还来你家！', stamp: '🍳', date: '02.01', priv: true },
  { from: '大橙子', msg: '你选的片子太好了', stamp: '🎬', date: '01.25', photo: photos.cozy, priv: false },
  { from: '星星', msg: '第一次来就感觉像老朋友', stamp: '☕', date: '01.18', priv: true },
  { from: 'Leo', msg: '你推荐的电影都好棒，品味一致', stamp: '🎬', date: '01.10', priv: false },
  { from: '小鱼', msg: '和你打羽毛球好开心！', stamp: '🏸', date: '01.05', priv: false },
  { from: '阿德', msg: '谢谢你带我融入这个社区', stamp: '❤️', date: '12.28', priv: true },
  { from: 'Mia', msg: '你做的甜品太赞了', stamp: '🧁', date: '12.24', photo: photos.potluck, priv: false },
  { from: '奶茶', msg: '下次一起再来你家看电影', stamp: '🎬', date: '12.15', priv: true },
  { from: 'Derek', msg: '徒步那天太开心了，风景绝美', stamp: '🥾', date: '11.16', photo: photos.nature, priv: false },
];

export const cardsSent: CardReceived[] = [
  { from: 'Yuan', msg: '谢谢白开水每次精心选片', stamp: '🎬', date: '02.08', priv: false },
  { from: 'Yuan', msg: 'Tiffy 做的蛋糕太好吃了', stamp: '🧁', date: '02.01', priv: false },
  { from: 'Yuan', msg: '大橙子你太有活力了', stamp: '⚡', date: '01.25', priv: true },
  { from: 'Yuan', msg: '星星欢迎加入串门大家庭', stamp: '🎉', date: '01.18', priv: false },
  { from: 'Yuan', msg: 'Derek 带路的徒步线路真棒', stamp: '🥾', date: '11.16', priv: false },
];

/** ===== Profile ===== */
export const profileStats = [
  { n: '24', l: '活动' },
  { n: '6', l: 'Host' },
  { n: '15', l: '推荐' },
  { n: '48', l: '投票' },
];

export const recentActivity = [
  { name: '电影夜 · 寄生虫', date: '02.08', role: 'Host', emoji: '🎬' },
  { name: 'Potluck · 新年饭局', date: '01.25', role: 'Host', emoji: '🍳' },
  { name: '电影夜 · 千与千寻', date: '01.18', role: 'Host', emoji: '🎬' },
  { name: 'High Point 徒步', date: '01.12', emoji: '🥾' },
  { name: '圣诞 Party', date: '12.24', role: 'Host', emoji: '🎄' },
  { name: '电影夜 · 东京物语', date: '12.15', role: 'Host', emoji: '🎬' },
  { name: '感恩节 Potluck', date: '11.28', emoji: '🦃' },
  { name: 'Fall Hike · Watchung', date: '11.16', emoji: '🍂' },
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
