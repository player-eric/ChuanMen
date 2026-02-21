import type {
  MemberData, EventData, PastEvent, Proposal,
  MoviePool, MovieScreened, CardReceived,
} from '@/types';
import { photos } from '@/theme';

/** ===== Members ===== */
export const membersData: MemberData[] = [
  {
    name: '白开水', role: '核心 Host', host: 8, badge: '🏠',
    titles: ['🍳 厨神', '🔥 氛围担当'],
    mutual: { movies: ['花样年华', '春光乍泄', '惊魂记'], events: ['02.08 电影夜', '01.25 新年饭局', '01.18 电影夜', '01.05 Potluck'], evtCount: 8, cards: 3 },
  },
  {
    name: '大橙子', role: '运营', host: 5, badge: '🏠',
    titles: ['📸 首席摄影'],
    mutual: { movies: ['寄生虫', '燃烧女子的肖像'], events: ['02.08 电影夜', '01.12 徒步'], evtCount: 4, cards: 1 },
  },
  {
    name: '星星', role: '', host: 0, titles: ['🧊 破冰王'],
    mutual: { movies: ['东京物语'], events: ['02.08 电影夜'], evtCount: 2, cards: 2 },
  },
  {
    name: 'Tiffy', role: '', host: 2, badge: '🏠', titles: ['🍳 厨神'],
    mutual: { movies: ['花样年华', '千与千寻', '惊魂记'], events: ['02.08 电影夜', '01.25 新年饭局'], evtCount: 5, cards: 2 },
  },
  {
    name: '小鱼', role: '', host: 0, titles: [],
    mutual: { movies: [], events: ['01.12 徒步'], evtCount: 1, cards: 0 },
  },
  {
    name: 'Leo', role: '', host: 1, titles: [],
    mutual: { movies: ['重庆森林'], events: ['01.25 新年饭局'], evtCount: 2, cards: 0 },
  },
  {
    name: 'Mia', role: '新成员', host: 0, titles: [],
    mutual: { movies: [], events: [], evtCount: 0, cards: 0 },
  },
];

/** ===== Events ===== */
export const upcomingEvents: EventData[] = [
  {
    id: 1, title: '周六电影夜 · 花样年华', host: '白开水', date: '2.22 周六 7pm',
    location: '白开水家', scene: 'movieNight', film: '花样年华', spots: 4, total: 8,
    people: ['白开水', 'Yuan', '大橙子', '星星'], phase: 'open',
    desc: '王家卫经典。灯光调暗，坐在地下室沙发上，一起感受六十年代的香港。',
  },
  {
    id: 2, title: 'Potluck · 来我家吃火锅', host: 'Tiffy', date: '2.28 周五 6pm',
    location: 'Tiffy 家', scene: 'potluck', spots: 2, total: 8,
    people: ['Tiffy', '大橙子', '星星'], phase: 'open',
    desc: '铜锅涮肉！食材 AA，Tiffy 准备锅底和蘸料。',
  },
  {
    id: 3, title: 'Spring Hike · Delaware Water Gap', host: '大橙子', date: '3.08 周六 9am',
    location: 'Delaware Water Gap', scene: 'hike', spots: 6, total: 10,
    people: ['大橙子', 'Yuan'], phase: 'invite', invitedBy: '大橙子',
    desc: '春季徒步，中等难度，来回大约 3 小时。拼车从 Jersey City 出发。',
  },
];

export const proposals: Proposal[] = [
  { name: 'Tiffy', title: '周末一起去爬 High Point？', votes: 5, interested: ['星星', '大橙子', '白开水'], time: '3 天前' },
  { name: '星星', title: '找个周末一起去 MOMA？', votes: 3, interested: ['Yuan', 'Tiffy'], time: '5 天前' },
  { name: '小鱼', title: '有人想打羽毛球吗', votes: 8, interested: ['Leo', '大橙子', '白开水', 'Yuan'], time: '1 周前' },
];

export const pastEvents: PastEvent[] = [
  { title: '电影夜 · 寄生虫', host: '白开水', date: '02.08', people: 8, scene: 'movieNight', film: '寄生虫' },
  { title: '新年饭局 Potluck', host: 'Yuan', date: '01.25', people: 10, scene: 'potluck' },
  { title: '电影夜 · 千与千寻', host: 'Yuan', date: '01.18', people: 7, scene: 'movieNight', film: '千与千寻' },
  { title: 'High Point 徒步', host: '大橙子', date: '01.12', people: 6, scene: 'hike' },
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
