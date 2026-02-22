import type {
  MemberData, EventData, PastEvent, Proposal,
  MoviePool, MovieScreened, CardReceived,
} from '@/types';
import { photos } from '@/theme';

/** ===== Members (v2.1: added email, bio, profile fields) ===== */
export const membersData: MemberData[] = [
  {
    name: '白开水', role: '核心 Host', host: 8, badge: '🏠',
    titles: ['🍳 厨神', '🔥 氛围担当'],
    email: 'bks@example.com', location: 'Edison, NJ',
    bio: '喜欢在家里布置一个温暖的小影院，每次有朋友来都很开心。',
    selfAsFriend: '靠谱，话不多但什么都愿意帮忙。',
    idealFriend: '真诚、不装、能一起安静待着的人。',
    participationPlan: '继续做 Host，希望每月至少一次电影夜。',
    mutual: { movies: ['花样年华', '春光乍泄', '惊魂记'], events: ['02.08 电影夜', '01.25 新年饭局', '01.18 电影夜', '01.05 Potluck'], evtCount: 8, cards: 3 },
  },
  {
    name: '大橙子', role: '运营', host: 5, badge: '🏠',
    titles: ['📸 首席摄影'],
    email: 'dachengzi@example.com', location: 'Jersey City, NJ',
    bio: '摄影爱好者，喜欢记录生活中的小确幸。',
    selfAsFriend: '热情、爱拍照、随叫随到。',
    idealFriend: '有趣的灵魂，不用很外向。',
    participationPlan: '多拍照记录，当好活动摄影师。',
    mutual: { movies: ['寄生虫', '燃烧女子的肖像'], events: ['02.08 电影夜', '01.12 徒步'], evtCount: 4, cards: 1 },
  },
  {
    name: '星星', role: '', host: 0, titles: ['🧊 破冰王'],
    email: 'star@example.com', location: 'Princeton, NJ',
    bio: '社恐但是很想交朋友的矛盾体。',
    selfAsFriend: '慢热但一旦熟了话超多。',
    idealFriend: '耐心、幽默、不嫌我话多。',
    participationPlan: '先参加活动认识大家，说不定哪天会鼓起勇气做一次 Host。',
    mutual: { movies: ['东京物语'], events: ['02.08 电影夜'], evtCount: 2, cards: 2 },
  },
  {
    name: 'Tiffy', role: '', host: 2, badge: '🏠', titles: ['🍳 厨神'],
    email: 'tiffy@example.com', location: 'Edison, NJ',
    bio: '做饭使我快乐，分享使我更快乐。',
    selfAsFriend: '爱做饭、爱分享、爱热闹。',
    idealFriend: '吃货，真诚，能一起探店。',
    participationPlan: '多组织 Potluck，带大家吃好吃的。',
    mutual: { movies: ['花样年华', '千与千寻', '惊魂记'], events: ['02.08 电影夜', '01.25 新年饭局'], evtCount: 5, cards: 2 },
  },
  {
    name: '小鱼', role: '', host: 0, titles: [],
    email: 'xiaoyu@example.com', location: 'New Brunswick, NJ',
    bio: '刚来新泽西，想认识新朋友。',
    mutual: { movies: [], events: ['01.12 徒步'], evtCount: 1, cards: 0 },
  },
  {
    name: 'Leo', role: '', host: 1, titles: [],
    email: 'leo@example.com', location: 'Hoboken, NJ',
    bio: '电影发烧友，王家卫铁粉。',
    mutual: { movies: ['重庆森林'], events: ['01.25 新年饭局'], evtCount: 2, cards: 0 },
  },
  {
    name: 'Mia', role: '新成员', host: 0, titles: [],
    email: 'mia@example.com', location: 'Edison, NJ', hideEmail: true,
    bio: '第一次参加这种社群活动，有点紧张但很期待。',
    mutual: { movies: [], events: [], evtCount: 0, cards: 0 },
  },
];

/** ===== Events (v2.1: 5-phase lifecycle + home event + house rules) ===== */
export const upcomingEvents: EventData[] = [
  {
    id: 1, title: '周六电影夜 · 花样年华', host: '白开水', date: '2.22 周六 7pm',
    location: 'Edison, NJ', locationPrivate: '123 Maple St, Edison, NJ 08820',
    isHomeEvent: true, scene: 'movieNight', film: '花样年华', spots: 4, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星'], phase: 'open',
    desc: '王家卫经典。灯光调暗，坐在地下室沙发上，一起感受六十年代的香港。',
    houseRules: '请换鞋入内 · 10pm 前结束 · 可以带零食',
  },
  {
    id: 2, title: 'Potluck · 来我家吃火锅', host: 'Tiffy', date: '2.28 周五 6pm',
    location: 'Edison, NJ', locationPrivate: '456 Oak Ave, Edison, NJ 08820',
    isHomeEvent: true, scene: 'potluck', spots: 2, total: 8,
    people: ['Tiffy', '大橙子', '星星'], phase: 'open',
    desc: '铜锅涮肉！食材 AA，Tiffy 准备锅底和蘸料。',
    houseRules: '请自带一道菜 · 有猫，注意过敏',
  },
  {
    id: 3, title: 'Spring Hike · Delaware Water Gap', host: '大橙子', date: '3.08 周六 9am',
    location: 'Delaware Water Gap', scene: 'hike', spots: 6, total: 10,
    people: ['大橙子', 'Yuan'], phase: 'invite', invitedBy: '大橙子',
    desc: '春季徒步，中等难度，来回大约 3 小时。拼车从 Jersey City 出发。',
  },
];

export const liveEvents: EventData[] = [
  {
    id: 4, title: '周五电影夜 · 寄生虫', host: '白开水', date: '2.21 周五 7pm',
    location: 'Edison, NJ', isHomeEvent: true, scene: 'movieNight', film: '寄生虫',
    spots: 0, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星', 'Tiffy', '小鱼', 'Leo', 'Mia'],
    phase: 'live',
    desc: '正在进行中的电影夜，一起看奉俊昊的《寄生虫》。',
  },
];

export const proposals: Proposal[] = [
  { name: 'Tiffy', title: '周末一起去爬 High Point？', votes: 5, interested: ['星星', '大橙子', '白开水'], time: '3 天前' },
  { name: '星星', title: '找个周末一起去 MOMA？', votes: 3, interested: ['Yuan', 'Tiffy'], time: '5 天前' },
  { name: '小鱼', title: '有人想打羽毛球吗', votes: 8, interested: ['Leo', '大橙子', '白开水', 'Yuan'], time: '1 周前' },
];

export const pastEvents: PastEvent[] = [
  { title: '电影夜 · 寄生虫', host: '白开水', date: '02.08', people: 8, scene: 'movieNight', film: '寄生虫', photoCount: 12, commentCount: 5 },
  { title: '新年饭局 Potluck', host: 'Yuan', date: '01.25', people: 10, scene: 'potluck', photoCount: 18, commentCount: 8 },
  { title: '电影夜 · 千与千寻', host: 'Yuan', date: '01.18', people: 7, scene: 'movieNight', film: '千与千寻', photoCount: 6, commentCount: 3 },
  { title: 'High Point 徒步', host: '大橙子', date: '01.12', people: 6, scene: 'hike', photoCount: 24, commentCount: 4 },
];

/** ===== Movies ===== */
export const moviePool: MoviePool[] = [
  { id: 1, title: '花样年华', year: '2000', dir: '王家卫', v: 12, status: '本周放映', by: 'Yuan' },
  { id: 2, title: '惊魂记', year: '1960', dir: '希区柯克', v: 9, by: '白开水' },
  { id: 3, title: '永恒和一日', year: '1998', dir: '安哲罗普洛斯', v: 7, by: 'Yuan' },
  { id: 4, title: '东京物语', year: '1953', dir: '小津安二郎', v: 6, by: '星星' },
  { id: 5, title: '燃烧女子的肖像', year: '2019', dir: '瑟琳·席安玛', v: 5, by: 'Tiffy' },
];

export const movieScreened: MovieScreened[] = [
  { title: '寄生虫', year: '2019', dir: '奉俊昊', date: '02.08', host: '白开水' },
  { title: '千与千寻', year: '2001', dir: '宫崎骏', date: '02.01', host: 'Yuan' },
  { title: '春光乍泄', year: '1997', dir: '王家卫', date: '01.25', host: '白开水' },
];

/** ===== Cards ===== */
export const cardPeople = [
  { name: '白开水', ctx: '电影夜 Host', badge: '🏠' },
  { name: '大橙子', ctx: '一起参加了电影夜' },
  { name: '星星', ctx: '第一次来串门' },
  { name: 'Tiffy', ctx: '一起参加了电影夜' },
];

export const quickMessages = [
  '谢谢你的招待 🏠',
  '你做的菜太好吃了 🍳',
  '和你聊天很开心 💬',
  '下次还想见到你 👋',
];

export const myCards: CardReceived[] = [
  { from: '白开水', msg: '谢谢你每次都把地下室收拾得像个小影院', stamp: '🎬', date: '02.08', photo: photos.movieNight, priv: false },
  { from: 'Tiffy', msg: '氛围超棒，下次还来你家！', stamp: '🍳', date: '02.01', priv: true },
  { from: '大橙子', msg: '你选的片子太好了', stamp: '🎬', date: '01.25', photo: photos.cozy, priv: false },
  { from: '星星', msg: '第一次来就感觉像老朋友', stamp: '☕', date: '01.18', priv: true },
];

/** ===== Profile ===== */
export const profileStats = [
  { n: '18', l: '活动' },
  { n: '3', l: 'Host' },
  { n: '12', l: '推荐' },
  { n: '36', l: '投票' },
];

export const recentActivity = [
  { name: '电影夜 · 寄生虫', date: '02.08', role: 'Host', emoji: '🎬' },
  { name: 'Potluck · 新年饭局', date: '01.25', emoji: '🍳' },
  { name: '电影夜 · 千与千寻', date: '01.18', role: 'Host', emoji: '🎬' },
  { name: 'High Point 徒步', date: '01.12', emoji: '🥾' },
];
