/** 串门儿 Design Tokens */

export const c = {
  bg: '#0C0C0E',
  s1: '#141416',
  s2: '#1C1C1F',
  s3: '#262629',
  line: '#2A2A2F',
  text: '#E8E6E2',
  text2: '#9A9894',
  text3: '#5A5854',
  warm: '#D4A574',
  warmDim: '#D4A57412',
  warmGlow: '#D4A57425',
  paper: '#F5F0E8',
  paperDark: '#E8E0D4',
  ink: '#2C2420',
  inkLight: '#5C5248',
  green: '#6BCB77',
  blue: '#5B8DEF',
  red: '#E85D5D',
  stamp: '#C4442A',
} as const;

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
};

/** Scene photo gradient backgrounds */
export const photos: Record<string, string> = {
  movieNight: 'linear-gradient(135deg, #1a1520 0%, #2a2035 20%, #3a2530 40%, #4a2838 55%, #2a1825 75%, #1a1018 100%)',
  potluck: 'linear-gradient(140deg, #1a1810 0%, #2a2818 20%, #4a4028 40%, #3a3520 60%, #282518 80%, #1a1810 100%)',
  hike: 'linear-gradient(130deg, #0a1a20 0%, #1a3040 20%, #204a58 40%, #286050 55%, #1a3040 75%, #0a1a20 100%)',
  cozy: 'linear-gradient(145deg, #201510 0%, #352518 20%, #4a3525 40%, #3a2a20 60%, #302015 80%, #201510 100%)',
};
