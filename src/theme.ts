/** 串门儿 Design Tokens */

export type DesignTokens = { readonly [K in keyof typeof cDark]: string };

const cDark = {
  bg: '#121214',
  s1: '#1E1E22',
  s2: '#26262B',
  s3: '#2E2E33',
  line: '#3E3E44',
  text: '#E8E6E2',
  text2: '#9A9894',
  text3: '#5A5854',
  warm: '#D4A574',
  warmDim: '#D4A57412',
  warmGlow: '#D4A57425',
  paper: '#1E1C1A',
  paperDark: '#161412',
  ink: '#E0D8CE',
  inkLight: '#9A9088',
  green: '#6BCB77',
  blue: '#5B8DEF',
  red: '#E85D5D',
  stamp: '#D4A574',
} as const;

export const cLight: DesignTokens = {
  bg: '#FAFAF8',
  s1: '#FFFFFF',
  s2: '#E8E6E2',
  s3: '#DEDCD8',
  line: '#D0CEC8',
  text: '#1C1A16',
  text2: '#706E68',
  text3: '#A0A09A',
  warm: '#B87840',
  warmDim: '#B8784015',
  warmGlow: '#B8784028',
  paper: '#F5F0E8',
  paperDark: '#E8E0D4',
  ink: '#2C2420',
  inkLight: '#5C5248',
  green: '#4CAF50',
  blue: '#4A80D8',
  red: '#D84040',
  stamp: '#C4442A',
} as const;

/** Default dark tokens (for static imports) */
export const c = cDark;

export { cDark };

export const f = "'PingFang SC','Noto Sans SC',-apple-system,sans-serif";
export const hf = "'Georgia','Noto Serif SC',serif";

export const globalStyles = `
  * { box-sizing:border-box; margin:0; padding:0; }
  textarea::placeholder { color:${c.text3}; font-style:italic; }
  input::placeholder { color:${c.text3}; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:${c.bg}; }
  ::-webkit-scrollbar-thumb { background:${c.s3}; border-radius:2px; }
  @keyframes fadeIn {
    from { opacity:0; transform:translateY(6px); }
    to { opacity:1; transform:translateY(0); }
  }
`;

/** Poster data: background gradients & accents for movie posters */
export const posters: Record<string, { bg: string; accent: string; sub: string }> = {
  '花样年华': { bg: 'linear-gradient(160deg, #1a0a0a 0%, #4a1528 35%, #8b2252 65%, #2a0a1a 100%)', accent: '#e8a0b0', sub: 'In the Mood for Love · 2000' },
  '重庆森林': { bg: 'linear-gradient(150deg, #0a1a2a 0%, #1a4a3a 30%, #2a8a5a 55%, #0a2a1a 100%)', accent: '#7ed4a0', sub: 'Chungking Express · 1994' },
  '惊魂记': { bg: 'linear-gradient(170deg, #1a1a1a 0%, #2a2a3a 40%, #4a3a5a 70%, #0a0a1a 100%)', accent: '#b0a0d0', sub: 'Psycho · 1960' },
  '永恒和一日': { bg: 'linear-gradient(145deg, #1a1a0a 0%, #3a3a1a 35%, #6a6a2a 60%, #1a1a0a 100%)', accent: '#d4d490', sub: 'Eternity and a Day · 1998' },
  '东京物语': { bg: 'linear-gradient(155deg, #0a0a0a 0%, #2a1a0a 40%, #5a3a1a 65%, #1a0a0a 100%)', accent: '#d4a870', sub: 'Tokyo Story · 1953' },
  '燃烧女子的肖像': { bg: 'linear-gradient(165deg, #0a0a1a 0%, #1a1a4a 35%, #3a2a6a 60%, #0a0a2a 100%)', accent: '#a0a0e8', sub: 'Portrait of a Lady on Fire · 2019' },
  '寄生虫': { bg: 'linear-gradient(140deg, #0a1a0a 0%, #1a3a1a 30%, #2a5a2a 55%, #0a1a0a 100%)', accent: '#80c880', sub: 'Parasite · 2019' },
  '千与千寻': { bg: 'linear-gradient(155deg, #1a0a1a 0%, #3a1a4a 35%, #5a2a7a 60%, #1a0a2a 100%)', accent: '#c890d8', sub: 'Spirited Away · 2001' },
  '春光乍泄': { bg: 'linear-gradient(160deg, #2a1a0a 0%, #5a3a0a 35%, #8a5a1a 55%, #2a1a0a 100%)', accent: '#e8c870', sub: 'Happy Together · 1997' },
  '小偷家族': { bg: 'linear-gradient(150deg, #0a1210 0%, #1a2a28 30%, #2a4a40 55%, #0a1a18 100%)', accent: '#88c8b0', sub: 'Shoplifters · 2018' },
  '四百击': { bg: 'linear-gradient(155deg, #1a1a1a 0%, #3a3a3a 35%, #5a5a5a 60%, #1a1a1a 100%)', accent: '#c0c0c0', sub: 'The 400 Blows · 1959' },
  '红色沙漠': { bg: 'linear-gradient(145deg, #1a0a0a 0%, #4a1a1a 35%, #6a2a1a 60%, #1a0a0a 100%)', accent: '#e8a080', sub: 'Red Desert · 1964' },
  '请以你的名字呼唤我': { bg: 'linear-gradient(160deg, #0a1a10 0%, #1a3a28 30%, #3a6a48 55%, #0a1a10 100%)', accent: '#90d8a8', sub: 'Call Me by Your Name · 2017' },
  '秋刀鱼之味': { bg: 'linear-gradient(150deg, #1a100a 0%, #3a2818 30%, #5a4028 55%, #1a100a 100%)', accent: '#d8b880', sub: 'An Autumn Afternoon · 1962' },
  '大佛普拉斯': { bg: 'linear-gradient(155deg, #0a0a0a 0%, #1a2a1a 35%, #2a4a2a 60%, #0a0a0a 100%)', accent: '#98c898', sub: 'The Great Buddha+ · 2017' },
  '坠落的审判': { bg: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a3a 35%, #3a3a5a 60%, #1a1a1a 100%)', accent: '#a0a0d0', sub: 'Anatomy of a Fall · 2023' },
  '完美的日子': { bg: 'linear-gradient(160deg, #0a1510 0%, #1a3028 30%, #2a4838 55%, #0a1510 100%)', accent: '#80c0a0', sub: 'Perfect Days · 2023' },
  // Books
  '活着': { bg: 'linear-gradient(155deg, #1a0a0a 0%, #3a1a0a 35%, #5a2a0a 60%, #1a0a0a 100%)', accent: '#e8b070', sub: 'To Live · 余华 · 1993' },
  '百年孤独': { bg: 'linear-gradient(160deg, #0a1a10 0%, #1a3a20 30%, #2a5a30 55%, #0a1a10 100%)', accent: '#90d890', sub: 'Cien años de soledad · 马尔克斯 · 1967' },
  '挪威的森林': { bg: 'linear-gradient(145deg, #1a0a1a 0%, #2a1a3a 35%, #4a2a5a 60%, #1a0a1a 100%)', accent: '#c8a0e0', sub: 'Norwegian Wood · 村上春树 · 1987' },
  '小王子': { bg: 'linear-gradient(150deg, #0a0a2a 0%, #1a1a4a 30%, #2a2a6a 55%, #0a0a2a 100%)', accent: '#a0b8e8', sub: 'Le Petit Prince · 圣埃克苏佩里 · 1943' },
  '红楼梦': { bg: 'linear-gradient(165deg, #2a0a0a 0%, #5a1a1a 35%, #7a2a2a 60%, #2a0a0a 100%)', accent: '#e8a0a0', sub: 'Dream of the Red Chamber · 曹雪芹' },
  '三体': { bg: 'linear-gradient(140deg, #0a0a1a 0%, #1a1a3a 30%, #2a3a5a 55%, #0a0a1a 100%)', accent: '#90b0d8', sub: 'The Three-Body Problem · 刘慈欣 · 2008' },
  '围城': { bg: 'linear-gradient(155deg, #1a1a0a 0%, #3a3a1a 35%, #5a5a2a 60%, #1a1a0a 100%)', accent: '#d0d088', sub: 'Fortress Besieged · 钱钟书 · 1947' },
  '月亮与六便士': { bg: 'linear-gradient(160deg, #1a100a 0%, #3a2a1a 30%, #5a4a2a 55%, #1a100a 100%)', accent: '#d8c080', sub: 'The Moon and Sixpence · 毛姆 · 1919' },
  '人间失格': { bg: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a2a 35%, #2a2a4a 60%, #0a0a0a 100%)', accent: '#b0b0d0', sub: 'No Longer Human · 太宰治 · 1948' },
  '解忧杂货店': { bg: 'linear-gradient(150deg, #1a1510 0%, #3a2a18 30%, #4a3a28 55%, #1a1510 100%)', accent: '#d4b890', sub: 'ナミヤ雑貨店の奇蹟 · 东野圭吾 · 2012' },
};

/** Scene photo gradient backgrounds */
export const photos: Record<string, string> = {
  movieNight: 'linear-gradient(135deg, #1a1520 0%, #2a2035 20%, #3a2530 40%, #4a2838 55%, #2a1825 75%, #1a1018 100%)',
  potluck: 'linear-gradient(140deg, #1a1810 0%, #2a2818 20%, #4a4028 40%, #3a3520 60%, #282518 80%, #1a1810 100%)',
  hike: 'linear-gradient(130deg, #0a1a20 0%, #1a3040 20%, #204a58 40%, #286050 55%, #1a3040 75%, #0a1a20 100%)',
  cozy: 'linear-gradient(145deg, #201510 0%, #352518 20%, #4a3525 40%, #3a2a20 60%, #302015 80%, #201510 100%)',
  coffee: 'linear-gradient(140deg, #1a1510 0%, #2a2218 20%, #3a3025 40%, #2a2520 60%, #221c15 80%, #1a1510 100%)',
  sports: 'linear-gradient(135deg, #0a1518 0%, #142830 20%, #1e3a42 40%, #183028 60%, #122520 80%, #0a1518 100%)',
  nature: 'linear-gradient(150deg, #0e1a10 0%, #1a3018 20%, #254a28 40%, #1e3a20 60%, #162e18 80%, #0e1a10 100%)',
};
