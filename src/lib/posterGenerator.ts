/**
 * Event Poster Auto-Generation via Canvas API
 *
 * Generates a 1080×1440px (3:4) poster PNG from event data.
 * No external dependencies — uses browser-native Canvas API.
 *
 * Two layout modes:
 *   - WITH cover image: adaptive frame (portrait/landscape)
 *   - WITHOUT cover image: typography-driven, vertically centered
 *
 * Visual layers (draw order):
 *   1. Gradient background (from theme.ts scene palettes)
 *   2. Vignette (radial edge darkening)
 *   3. Ambient glow (warm accent spots)
 *   4. Theme atmosphere (event-type specific decorations across poster)
 *   5. Layout content (category, image/text, info, dividers)
 *   6. Logo + brand footer
 *   7. Procedural grain (pixel noise — LAST, covers everything)
 */

import { photos } from '@/theme';
import { eventTagToScene } from '@/lib/mappings';

/* ── Poster template per EventTag ── */

interface PosterTemplate {
  titleCN: string;
  subtitleEN: string;
  sceneKey: string;
  accent: string;
}

const templates: Record<string, PosterTemplate> = {
  movie:       { titleCN: '电影串门儿',  subtitleEN: 'At the Living Room',      sceneKey: 'movieNight', accent: '#d4a574' },
  chuanmen:    { titleCN: '茶话串门儿',  subtitleEN: 'Tea & Talk',              sceneKey: 'cozy',       accent: '#d4a574' },
  outdoor:     { titleCN: '户外串门儿',  subtitleEN: 'Into the Wild',           sceneKey: 'nature',     accent: '#6BCB77' },
  hiking:      { titleCN: '野外串门儿',  subtitleEN: 'Visiting the Outdoors',   sceneKey: 'hike',       accent: '#6BCB77' },
  holiday:     { titleCN: '节日串门儿',  subtitleEN: 'Celebrating Together',    sceneKey: 'potluck',    accent: '#e85d5d' },
  small_group: { titleCN: '小聚串门儿',  subtitleEN: 'A Cozy Gathering',        sceneKey: 'coffee',     accent: '#d4a574' },
  other:       { titleCN: '串门儿',      subtitleEN: 'Get Together',            sceneKey: 'coffee',     accent: '#d4a574' },
};

/* Font stacks — matching theme.ts */
const SANS = '"PingFang SC","Noto Sans SC",-apple-system,sans-serif';
const SERIF = 'Georgia,"Noto Serif SC",serif';

/** Apply letter spacing by drawing chars individually. Returns total width drawn. */
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  centered = false,
) {
  // Measure total width first
  let totalW = 0;
  for (const ch of text) totalW += ctx.measureText(ch).width + spacing;
  totalW -= spacing; // no trailing space

  let cx = centered ? x - totalW / 2 : x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return totalW;
}

/* ── Public API ── */

export interface PosterParams {
  title: string;
  date: string;
  location: string;
  eventTag: string;
  coverImageUrl?: string;
  /** Host name — used for home events ("XX的家") */
  hostName?: string;
  /** Movie name (if different from event title) */
  movieName?: string;
  /** e.g. "2023 · 导演: Christopher Nolan" */
  movieMeta?: string;
}

export async function generateEventPoster(params: PosterParams): Promise<Blob> {
  const W = 1080;
  const H = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const tpl = templates[params.eventTag] ?? templates.other;

  // 0. Pre-load cover image (needed before background decision)
  let coverImg: HTMLImageElement | null = null;
  if (params.coverImageUrl) {
    try {
      coverImg = await loadImage(params.coverImageUrl);
    } catch (err) {
      console.warn('Poster: cover image load failed, using text-only layout', err);
    }
  }

  // 1. Background: blurred cover if available, otherwise gradient
  if (coverImg) {
    drawBlurredImageBg(ctx, W, H, coverImg);
  } else {
    drawGradientBg(ctx, W, H, tpl.sceneKey);
  }

  // 2. Vignette (edge darkening)
  drawVignette(ctx, W, H);

  // 3. Ambient glow (warm accent spots)
  drawAmbientGlow(ctx, W, H, tpl.accent);

  // 4. Theme atmosphere — event-type decorations across entire poster
  drawThemeAtmosphere(ctx, W, H, tpl.accent, params.eventTag);

  if (coverImg) {
    drawLayoutWithImage(ctx, W, H, tpl, params, coverImg);
  } else {
    drawLayoutTextOnly(ctx, W, H, tpl, params);
  }

  // 6. Logo + brand
  await drawLogo(ctx, W, H, tpl.accent);

  // 7. Procedural grain — LAST (covers all layers uniformly)
  drawGrain(ctx, W, H);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════
   Theme Atmosphere — full-poster decorative layer per event type
   ══════════════════════════════════════════════ */

function drawThemeAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
  eventTag: string,
) {
  const rgb = hexToRgb(accent);
  if (!rgb) return;

  switch (eventTag) {
    case 'movie': return drawAtmosphereMovie(ctx, w, h, accent, rgb);
    case 'outdoor':
    case 'hiking': return drawAtmosphereNature(ctx, w, h, accent, rgb);
    case 'holiday': return drawAtmosphereHoliday(ctx, w, h, accent, rgb);
    case 'small_group': return drawAtmosphereBokeh(ctx, w, h, accent, rgb);
    default: return drawAtmosphereDefault(ctx, w, h, accent, rgb);
  }
}

/** Movie — film strips at poster edges, large reel circle, spotlight */
function drawAtmosphereMovie(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
  rgb: string,
) {
  // Vertical film strip borders at left & right poster edges
  const stripW = 32;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,0.25)`;
  ctx.fillRect(0, 0, stripW, h);
  ctx.fillRect(w - stripW, 0, stripW, h);
  // Strip inner edge line
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.20;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(stripW, 0); ctx.lineTo(stripW, h);
  ctx.moveTo(w - stripW, 0); ctx.lineTo(w - stripW, h);
  ctx.stroke();

  // Sprocket holes in edge strips
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(${rgb},0.15)`;
  const perfH = 6, perfW = 14, gap = 22;
  const count = Math.floor(h / (perfH + gap));
  for (let i = 0; i < count; i++) {
    const py = gap / 2 + i * (perfH + gap);
    roundRect(ctx, (stripW - perfW) / 2, py, perfW, perfH, 2);
    ctx.fill();
    roundRect(ctx, w - stripW + (stripW - perfW) / 2, py, perfW, perfH, 2);
    ctx.fill();
  }
  ctx.restore();

  // Large film reel circle — bottom right
  const rcx = w - 140, rcy = h - 340;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.10;
  ctx.beginPath(); ctx.arc(rcx, rcy, 200, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.08;
  ctx.beginPath(); ctx.arc(rcx, rcy, 160, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(rcx, rcy, 40, 0, Math.PI * 2); ctx.stroke();
  // Spokes
  ctx.globalAlpha = 0.07;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(rcx + Math.cos(a) * 42, rcy + Math.sin(a) * 42);
    ctx.lineTo(rcx + Math.cos(a) * 158, rcy + Math.sin(a) * 158);
    ctx.stroke();
  }
  ctx.restore();

  // Spotlight cone from top-left
  ctx.save();
  const spot = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
  spot.addColorStop(0, `rgba(${rgb},0.15)`);
  spot.addColorStop(0.4, `rgba(${rgb},0.05)`);
  spot.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Outdoor/Hiking — mountain silhouette, leaf shapes, trail path */
function drawAtmosphereNature(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
  rgb: string,
) {
  // Mountain silhouette at bottom
  ctx.save();
  ctx.fillStyle = `rgba(${rgb},0.10)`;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h - 120);
  ctx.lineTo(w * 0.15, h - 240);
  ctx.lineTo(w * 0.28, h - 170);
  ctx.lineTo(w * 0.42, h - 320);
  ctx.lineTo(w * 0.55, h - 210);
  ctx.lineTo(w * 0.65, h - 280);
  ctx.lineTo(w * 0.8, h - 190);
  ctx.lineTo(w * 0.92, h - 260);
  ctx.lineTo(w, h - 150);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Second layer mountains (darker, in front)
  ctx.fillStyle = `rgba(0,0,0,0.08)`;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h - 80);
  ctx.lineTo(w * 0.2, h - 160);
  ctx.lineTo(w * 0.35, h - 100);
  ctx.lineTo(w * 0.5, h - 200);
  ctx.lineTo(w * 0.7, h - 130);
  ctx.lineTo(w * 0.85, h - 170);
  ctx.lineTo(w, h - 90);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Scattered leaf shapes
  const leaves = [
    { x: 55, y: 180, s: 24, rot: 0.3 },
    { x: w - 60, y: 320, s: 20, rot: -0.5 },
    { x: 90, y: h - 450, s: 28, rot: 0.8 },
    { x: w - 80, y: h - 550, s: 22, rot: -0.2 },
    { x: w * 0.25, y: h - 300, s: 18, rot: 1.2 },
    { x: w - 50, y: 120, s: 16, rot: -0.8 },
  ];
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  for (const l of leaves) {
    ctx.globalAlpha = 0.18;
    drawLeaf(ctx, l.x, l.y, l.s, l.rot);
  }
  ctx.restore();

  // Dotted trail path
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 14]);
  ctx.beginPath();
  ctx.moveTo(w - 35, h * 0.15);
  ctx.bezierCurveTo(w - 90, h * 0.3, w - 25, h * 0.45, w - 70, h * 0.6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Sun glow from top-right corner
  ctx.save();
  const sun = ctx.createRadialGradient(w, 0, 0, w, 0, 500);
  sun.addColorStop(0, `rgba(${rgb},0.12)`);
  sun.addColorStop(0.5, `rgba(${rgb},0.04)`);
  sun.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Holiday — confetti dots, star clusters, festive diagonal lines */
function drawAtmosphereHoliday(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
  rgb: string,
) {
  // Scattered confetti dots — bigger and more visible
  ctx.save();
  const confetti = [
    { x: 50, y: 80, r: 6 }, { x: 160, y: 45, r: 5 },
    { x: w - 55, y: 95, r: 7 }, { x: w - 140, y: 55, r: 4 },
    { x: 35, y: h * 0.3, r: 5 }, { x: w - 40, y: h * 0.38, r: 6 },
    { x: 65, y: h * 0.55, r: 5 }, { x: w - 70, y: h * 0.5, r: 7 },
    { x: 50, y: h - 320, r: 6 }, { x: w - 55, y: h - 370, r: 5 },
    { x: w * 0.3, y: h - 260, r: 5 }, { x: w * 0.7, y: h - 290, r: 6 },
    { x: w * 0.5, y: 40, r: 4 }, { x: w * 0.8, y: h * 0.25, r: 5 },
  ];
  for (const c of confetti) {
    ctx.globalAlpha = 0.12 + Math.random() * 0.10;
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // Star clusters — bigger
  ctx.save();
  ctx.fillStyle = accent;
  const stars = [
    { x: 65, y: 130, s: 14 }, { x: w - 70, y: 170, s: 12 },
    { x: 45, y: h * 0.48, s: 10 }, { x: w - 50, y: h * 0.62, s: 13 },
    { x: w * 0.5, y: h - 280, s: 11 }, { x: w * 0.15, y: h * 0.7, s: 9 },
    { x: w * 0.85, y: h * 0.35, s: 10 },
  ];
  for (const s of stars) {
    ctx.globalAlpha = 0.20;
    drawStar(ctx, s.x, s.y, s.s);
  }
  ctx.restore();

  // Festive diagonal accent lines at corners — more visible
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 20 + i * 22);
    ctx.lineTo(20 + i * 22, 0);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(w, h - 20 - i * 22);
    ctx.lineTo(w - 20 - i * 22, h);
    ctx.stroke();
  }
  ctx.restore();

  // Warm glow center
  ctx.save();
  const glow = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, 500);
  glow.addColorStop(0, `rgba(${rgb},0.12)`);
  glow.addColorStop(0.6, `rgba(${rgb},0.04)`);
  glow.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Small Group — bokeh circles, candlelight glow */
function drawAtmosphereBokeh(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
  rgb: string,
) {
  // Bokeh circles — visible fills with glowing rings
  ctx.save();
  const bokeh = [
    { x: 70, y: 140, r: 60, a: 0.06 },
    { x: w - 90, y: 230, r: 80, a: 0.05 },
    { x: 110, y: h * 0.42, r: 50, a: 0.07 },
    { x: w - 70, y: h * 0.52, r: 65, a: 0.06 },
    { x: w * 0.4, y: h - 360, r: 75, a: 0.05 },
    { x: w * 0.75, y: h - 300, r: 55, a: 0.06 },
    { x: 55, y: h - 420, r: 45, a: 0.07 },
    { x: w * 0.5, y: 100, r: 40, a: 0.05 },
  ];
  for (const b of bokeh) {
    // Soft fill
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, `rgba(${rgb},${b.a * 2})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    // Ring outline
    ctx.globalAlpha = b.a * 3;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  // Candlelight warm glow — lower center
  ctx.save();
  const candle = ctx.createRadialGradient(w / 2, h * 0.7, 0, w / 2, h * 0.7, 350);
  candle.addColorStop(0, `rgba(${rgb},0.14)`);
  candle.addColorStop(0.4, `rgba(${rgb},0.05)`);
  candle.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = candle;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Cross-hatch in corners
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(0, h - i * 25);
    ctx.lineTo(i * 25, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w, i * 25);
    ctx.lineTo(w - i * 25, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** Default (chuanmen, other) — geometric patterns, dot grid */
function drawAtmosphereDefault(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  accent: string,
  rgb: string,
) {
  // Concentric rings — off-center, visible
  ctx.save();
  ctx.strokeStyle = accent;
  const rcx = w * 0.78, rcy = h * 0.28;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.10;
  ctx.beginPath(); ctx.arc(rcx, rcy, 260, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.07;
  ctx.beginPath(); ctx.arc(rcx, rcy, 200, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.05;
  ctx.beginPath(); ctx.arc(rcx, rcy, 140, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Dot grid pattern — bottom area, more visible
  ctx.save();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.10;
  const gridStartY = h * 0.72;
  for (let gx = 50; gx < w - 30; gx += 45) {
    for (let gy = gridStartY; gy < h - 200; gy += 45) {
      ctx.beginPath(); ctx.arc(gx, gy, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // Accent arc sweep — top-left, bolder
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(0, 0, 380, Math.PI * 0.08, Math.PI * 0.48);
  ctx.stroke();
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  ctx.arc(0, 0, 440, Math.PI * 0.08, Math.PI * 0.48);
  ctx.stroke();
  ctx.restore();

  // Diagonal accent lines — bottom left corner
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, h - 40 - i * 28);
    ctx.lineTo(40 + i * 28, h);
    ctx.stroke();
  }
  ctx.restore();

  // Warm radial from center
  ctx.save();
  const glow = ctx.createRadialGradient(w * 0.4, h * 0.5, 0, w * 0.4, h * 0.5, 450);
  glow.addColorStop(0, `rgba(${rgb},0.10)`);
  glow.addColorStop(0.5, `rgba(${rgb},0.03)`);
  glow.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ══════════════════════════════════════════════
   Layout WITH cover image — adaptive frame
   ══════════════════════════════════════════════ */
function drawLayoutWithImage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tpl: PosterTemplate,
  params: PosterParams,
  img: HTMLImageElement,
) {
  const PAD = 80;
  const MAX_IMG_W = w - PAD * 2; // 920
  const footerLineY = h - 180;

  // Measure text content first so we can size the image to fit
  ctx.save();
  ctx.font = `800 48px ${SANS}`;
  const lines = wrapText(ctx, params.title, w - PAD * 2);
  ctx.restore();
  const titleBlockH = Math.min(lines.length, 2) * 62;
  const infoH = measureInfoBlockH(params);

  // Fixed spacing
  const catH = 56 + 10 + 24; // titleCN + gap + subtitleEN
  const catToImgGap = 64;     // category → image
  const imgToAccent = 56;     // image → accent mark
  const accentToTitle = 32;   // accent mark → event title
  const titleToInfo = 16;     // title → info block
  const topPad = 60;
  const availH = footerLineY - topPad;

  // Compute max image height from remaining space (text + fixed gaps eat into available)
  const textAndGapsH = catH + catToImgGap + imgToAccent + accentToTitle + titleBlockH + titleToInfo + infoH;
  // Reserve ~15% of availH as breathing room (split top/bottom)
  const MAX_IMG_H = Math.min(580, availH - textAndGapsH - availH * 0.12);

  // Adaptive image frame — fit to natural aspect ratio
  const imgR = img.naturalWidth / img.naturalHeight || img.width / img.height;
  let frameW: number, frameH: number;
  if (imgR >= 1) {
    frameW = MAX_IMG_W;
    frameH = Math.min(MAX_IMG_W / imgR, MAX_IMG_H);
  } else {
    frameH = MAX_IMG_H;
    frameW = Math.min(MAX_IMG_H * imgR, MAX_IMG_W);
  }

  const totalH = catH + catToImgGap + frameH + imgToAccent + accentToTitle + titleBlockH + titleToInfo + infoH;

  // Position content — biased toward top (30% space above, 70% below)
  const startY = topPad + (availH - totalH) * 0.3;

  let curY = startY;

  // Category title (top) — spaced for editorial feel
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.fillStyle = tpl.accent;
  ctx.font = `800 56px ${SANS}`;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  drawSpacedText(ctx, tpl.titleCN, PAD, curY, 6);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.font = `italic 400 24px ${SERIF}`;
  drawSpacedText(ctx, tpl.subtitleEN, PAD, curY + 66, 3);
  ctx.restore();
  curY += catH + catToImgGap;

  // Image frame
  const frameX = (w - frameW) / 2;
  const frameY = curY;
  const radius = 16;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.50)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#000';
  roundRect(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.fill();
  ctx.restore();

  // Clip & draw image
  ctx.save();
  roundRect(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.clip();
  // Contain fit: center image within frame, preserving aspect ratio (no crop, no stretch)
  const imgAR = img.width / img.height;
  const frameAR = frameW / frameH;
  let dx = frameX, dy = frameY, dw = frameW, dh = frameH;
  if (imgAR > frameAR) {
    // Image wider than frame — fit to width, center vertically
    dh = frameW / imgAR;
    dy = frameY + (frameH - dh) / 2;
  } else if (imgAR < frameAR) {
    // Image taller than frame — fit to height, center horizontally
    dw = frameH * imgAR;
    dx = frameX + (frameW - dw) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);

  // Bottom fade overlay
  const fadeY = frameY + frameH * 0.65;
  const fadH = frameH * 0.35;
  const fadeGrad = ctx.createLinearGradient(0, fadeY, 0, frameY + frameH);
  fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fadeGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(frameX, fadeY, frameW, fadH);
  ctx.restore();

  // Accent border
  ctx.save();
  ctx.strokeStyle = tpl.accent;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  roundRect(ctx, frameX, frameY, frameW, frameH, radius);
  ctx.stroke();
  ctx.restore();

  // Corner ornaments
  drawCornerOrnaments(ctx, frameX, frameY, frameW, frameH, tpl.accent);

  curY = frameY + frameH + imgToAccent;

  // Short accent mark
  ctx.save();
  ctx.strokeStyle = tpl.accent;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, curY);
  ctx.lineTo(PAD + 80, curY);
  ctx.stroke();
  ctx.restore();

  // Event title — with text shadow for depth
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = `800 48px ${SANS}`;
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  curY += accentToTitle;
  for (const line of lines.slice(0, 2)) {
    drawSpacedText(ctx, line, PAD, curY, 2);
    curY += 62;
  }
  ctx.restore();

  // Info with bullets
  drawInfoBlock(ctx, PAD, curY + titleToInfo, params, tpl.accent, w - PAD);

  // Bottom line
  drawAccentLine(ctx, PAD, w - PAD, footerLineY, tpl.accent, 0.15);
}

/* ══════════════════════════════════════════════
   Layout WITHOUT cover image (typography-driven)
   ══════════════════════════════════════════════ */
function drawLayoutTextOnly(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tpl: PosterTemplate,
  params: PosterParams,
) {
  const cx = w / 2;
  const topPad = 80;
  const bottomLimit = h - 180;
  const availH = bottomLimit - topPad;

  const catTitleH = 78;
  const catGap = 14;
  const subtitleH = 26;
  const dividerGap = 50;
  const sz = params.title.length <= 6 ? 88 : params.title.length <= 12 ? 68 : 52;

  ctx.save();
  ctx.font = `700 ${sz}px ${SERIF}`;
  const titleLines = wrapText(ctx, params.title, w - 160);
  ctx.restore();
  const lineH = sz * 1.35;
  const titleBlockH = titleLines.length * lineH;

  const infoH = measureInfoBlockH(params);
  const totalH = catTitleH + catGap + subtitleH + dividerGap + titleBlockH + dividerGap + infoH;
  const startY = topPad + (availH - totalH) / 2;

  // Decorative rings (centered on content) — visible
  const ringCY = startY + totalH * 0.45;
  ctx.save();
  ctx.strokeStyle = tpl.accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.14;
  ctx.beginPath(); ctx.arc(cx, ringCY, 380, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.10;
  ctx.beginPath(); ctx.arc(cx, ringCY, 300, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.06;
  ctx.beginPath(); ctx.arc(cx, ringCY, 220, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  let y = startY;

  // Vertical accent bars — thicker, more visible
  const barH = catTitleH + catGap + subtitleH + 30;
  ctx.save();
  ctx.fillStyle = tpl.accent;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(cx - 330, y - 15, 3, barH);
  ctx.fillRect(cx + 328, y - 15, 3, barH);
  ctx.restore();

  // Category title — spaced, with shadow
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.fillStyle = tpl.accent;
  ctx.font = `800 ${catTitleH}px ${SANS}`;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 5;
  drawSpacedText(ctx, tpl.titleCN, cx, y, 8, true);
  ctx.shadowColor = 'transparent';
  y += catTitleH + catGap;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `italic 400 ${subtitleH}px ${SERIF}`;
  drawSpacedText(ctx, tpl.subtitleEN, cx, y, 4, true);
  y += subtitleH;
  ctx.restore();

  drawShortDivider(ctx, cx, y + dividerGap / 2, tpl.accent);
  y += dividerGap;

  // Accent diamond behind title
  drawAccentDiamond(ctx, cx, y + titleBlockH / 2, 200, tpl.accent);

  // Event title — serif with shadow
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#F0EDE8';
  ctx.font = `700 ${sz}px ${SERIF}`;
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  for (const line of titleLines.slice(0, 4)) {
    drawSpacedText(ctx, line, cx, y, sz <= 52 ? 2 : 4, true);
    y += lineH;
  }
  ctx.restore();

  drawShortDivider(ctx, cx, y + dividerGap / 2, tpl.accent);
  y += dividerGap;

  // Info block (centered for text-only layout)
  drawInfoBlockCentered(ctx, cx, y, params, tpl.accent);

  drawAccentLine(ctx, 80, w - 80, h - 180, tpl.accent, 0.15);
}

/* ── Decorative helpers ── */

/** Corner ornaments — L-shaped accent marks at image corners */
function drawCornerOrnaments(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  accent: string,
) {
  const len = 32;
  const gap = 14;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.35;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(fx - gap, fy - gap + len);
  ctx.lineTo(fx - gap, fy - gap);
  ctx.lineTo(fx - gap + len, fy - gap);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(fx + fw + gap - len, fy - gap);
  ctx.lineTo(fx + fw + gap, fy - gap);
  ctx.lineTo(fx + fw + gap, fy - gap + len);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(fx - gap, fy + fh + gap - len);
  ctx.lineTo(fx - gap, fy + fh + gap);
  ctx.lineTo(fx - gap + len, fy + fh + gap);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(fx + fw + gap - len, fy + fh + gap);
  ctx.lineTo(fx + fw + gap, fy + fh + gap);
  ctx.lineTo(fx + fw + gap, fy + fh + gap - len);
  ctx.stroke();
  ctx.restore();
}

/** Leaf shape for nature events */
function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.8, -size * 0.6, size * 0.8, size * 0.6, 0, size);
  ctx.bezierCurveTo(-size * 0.8, size * 0.6, -size * 0.8, -size * 0.6, 0, -size);
  ctx.stroke();
  // Midrib
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.8);
  ctx.lineTo(0, size * 0.8);
  ctx.stroke();
  ctx.restore();
}

/** 4-pointed star shape */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const ir = r * 0.35;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : ir;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** Rotated square (diamond/rhombus) decoration */
function drawAccentDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.globalAlpha = 0.12;
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.globalAlpha = 0.06;
  ctx.strokeRect(-size * 0.7 / 2, -size * 0.7 / 2, size * 0.7, size * 0.7);
  ctx.restore();
}

/* ── Image loading ── */

async function loadImage(url: string): Promise<HTMLImageElement> {
  // For local API media URLs (e.g. /api/media/s3/...), fetch as blob to avoid
  // cross-origin canvas tainting from S3 redirects
  if (url.startsWith('/api/media/')) {
    // Cache bust to always fetch latest image (cover image may have been replaced)
    const bustUrl = url + (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
    const res = await fetch(bustUrl);
    if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await imgFromSrc(objectUrl);
      // Don't revoke yet — canvas needs the blob URL alive during drawImage
      return img;
    } catch {
      URL.revokeObjectURL(objectUrl);
      throw new Error(`Failed to load media image: ${url}`);
    }
  }

  if (url.startsWith('/') && !url.startsWith('//')) {
    return imgFromSrc(url);
  }

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const img = await imgFromSrc(objectUrl);
        URL.revokeObjectURL(objectUrl);
        return img;
      } catch {
        URL.revokeObjectURL(objectUrl);
      }
    }
  } catch { /* CORS blocked — try proxy */ }

  const proxyUrl = `/api/media/proxy?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy fetch failed: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await imgFromSrc(objectUrl);
    URL.revokeObjectURL(objectUrl);
    return img;
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error(`Failed to load image: ${url}`);
  }
}

async function imgFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // Ensure full decode so naturalWidth/Height are correct
        await img.decode();
      } catch { /* decode() not supported or failed — onload dimensions should still work */ }
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Image load error: ${src}`));
    img.src = src;
  });
}

/* ── Depth & atmosphere layers ── */

/** Blurred cover image as background (replaces gradient when cover exists) */
function drawBlurredImageBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  img: HTMLImageElement,
) {
  const BLEED = 80; // extra px to avoid bright edges from blur
  ctx.save();
  ctx.filter = 'blur(40px)';
  // Cover-fit: scale image to fill canvas, cropping excess
  const imgR = img.width / img.height;
  const canvasR = w / h;
  let sw: number, sh: number, sx: number, sy: number;
  if (imgR > canvasR) {
    // Image wider — crop sides
    sh = img.height;
    sw = sh * canvasR;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    // Image taller — crop top/bottom
    sw = img.width;
    sh = sw / canvasR;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, -BLEED, -BLEED, w + BLEED * 2, h + BLEED * 2);
  ctx.filter = 'none';
  // Dark overlay for text contrast
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGradientBg(ctx: CanvasRenderingContext2D, w: number, h: number, sceneKey: string) {
  const gradientStr = photos[sceneKey] ?? photos.coffee;
  const match = gradientStr.match(/linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+)\)/);
  if (!match) { ctx.fillStyle = '#1a1510'; ctx.fillRect(0, 0, w, h); return; }

  const angleDeg = parseFloat(match[1]);
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  const diag = Math.sqrt(w * w + h * h) / 2;
  const cx = w / 2, cy = h / 2;
  const dx = Math.cos(angleRad) * diag, dy = Math.sin(angleRad) * diag;
  const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);

  const stopRegex = /(#[0-9a-fA-F]{3,8})\s+([\d.]+)%/g;
  let s;
  while ((s = stopRegex.exec(match[2])) !== null) {
    grad.addColorStop(parseFloat(s[2]) / 100, s[1]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  const cx = w / 2;
  const cy = h * 0.4;
  const r = 900;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawAmbientGlow(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  const rgb = hexToRgb(accent);
  if (!rgb) return;

  ctx.save();
  const g1 = ctx.createRadialGradient(w * 0.7, h * 0.25, 0, w * 0.7, h * 0.25, 500);
  g1.addColorStop(0, `rgba(${rgb},0.08)`);
  g1.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const g2 = ctx.createRadialGradient(w * 0.2, h * 0.75, 0, w * 0.2, h * 0.75, 400);
  g2.addColorStop(0, `rgba(${rgb},0.04)`);
  g2.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 25;
      d[i]     = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imageData, 0, 0);
  } catch {
    // Canvas tainted by cross-origin image — skip grain effect
  }
}

/* ── Shared drawing helpers ── */

async function drawLogo(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  const y = h - 150;
  try {
    const logoImg = await loadImage('/logo.png');
    ctx.drawImage(logoImg, 80, y, 44, 44);
  } catch {
    ctx.save();
    ctx.font = '36px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83D\uDEAA', 80, y + 22);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.font = `600 32px ${SANS}`;
  ctx.textBaseline = 'middle';
  drawSpacedText(ctx, '串门儿', 136, y + 22, 4);

  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = `300 20px ${SERIF}`;
  // Draw URL right-aligned manually
  const urlText = 'chuanmener.club';
  const urlW = ctx.measureText(urlText).width + 14 * 3; // approx with spacing
  drawSpacedText(ctx, urlText, w - 80 - urlW, y + 22, 1);
  ctx.restore();
}

function drawAccentLine(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string, alpha = 0.25) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawShortDivider(ctx: CanvasRenderingContext2D, cx: number, y: number, color: string) {
  const hw = 50;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - hw, y); ctx.lineTo(cx - 6, y); ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.arc(cx, y, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.beginPath(); ctx.moveTo(cx + 6, y); ctx.lineTo(cx + hw, y); ctx.stroke();
  ctx.restore();
}

/**
 * Simplify address for poster display: strip street address, keep city + state.
 * "225 Meadowlands Pkwy, Secaucus, NJ 07094" → "Secaucus, NJ"
 * "(居家)" + hostName → "XX的家"
 */
function posterLocation(loc: string, hostName?: string): string {
  // Home event
  if (loc === '(居家)' || loc === '居家') {
    return hostName ? `${hostName}的家` : '居家';
  }
  const parts = loc.split(',').map((s) => s.trim());
  if (parts.length >= 3) {
    // "225 Meadowlands Pkwy, Secaucus, NJ 07094"
    // → strip leading number from street, keep street name + city + state
    const street = parts[0].replace(/^\d+\s+/, '');  // remove leading "225 "
    const city = parts[parts.length - 2];
    const state = parts[parts.length - 1].replace(/\s*\d{5}(-\d{4})?$/, '').trim();
    return `${street}, ${city}, ${state}`;
  }
  if (parts.length === 2) {
    const state = parts[1].replace(/\s*\d{5}(-\d{4})?$/, '').trim();
    return `${parts[0]}, ${state}`;
  }
  return loc;
}

/** Calculate the height of the info block (for layout centering) */
function measureInfoBlockH(params: PosterParams): number {
  // Two-column layout: left (date, location) vs right (movie, votes)
  const leftLines = (params.date ? 1 : 0) + (params.location ? 1 : 0);
  const rightLines = (params.movieName ? 1 : 0) + (params.movieMeta ? 1 : 0);
  return Math.max(leftLines, rightLines) * 36;
}

/**
 * Two-column info layout for image poster:
 *   Left (PAD):  date, location
 *   Right (w-PAD, right-aligned): movieName, movieMeta, totalVotes
 */
function drawInfoBlock(ctx: CanvasRenderingContext2D, x: number, y: number, params: PosterParams, accent?: string, rightX?: number) {
  const rX = rightX ?? 1000; // right edge for right-aligned text
  ctx.save();
  ctx.textBaseline = 'top';

  // ── Left column: date + location ──
  let ly = y;
  if (params.date) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText(params.date, x, ly);
    ly += 36;
  }
  if (params.location) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText(posterLocation(params.location, params.hostName), x, ly);
  }

  // ── Right column: movie info + votes ──
  let ry = y;
  ctx.textAlign = 'right';
  if (params.movieName) {
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText(params.movieName, rX, ry);
    ry += 36;
  }
  if (params.movieMeta) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(params.movieMeta, rX, ry + 2);
    ry += 34;
  }
  ctx.restore();
}

/** Centered variant of drawInfoBlock for text-only layout */
function drawInfoBlockCentered(ctx: CanvasRenderingContext2D, cx: number, y: number, params: PosterParams, accent: string) {
  ctx.save();
  ctx.textBaseline = 'top';

  // Movie info centered above date/location
  if (params.movieName) {
    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.font = `500 26px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(params.movieName, cx, y);
    y += 36;
  }
  if (params.movieMeta) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `400 22px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(params.movieMeta, cx, y);
    y += 34;
  }

  // Date + location on one line, centered
  const infoParts: string[] = [];
  if (params.date) infoParts.push(params.date);
  if (params.location) infoParts.push(posterLocation(params.location, params.hostName));
  if (infoParts.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `400 26px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(infoParts.join('  \u00B7  '), cx, y);
    y += 38;
  }

  ctx.restore();
}

/* ── Canvas utilities ── */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = ch; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function hexToRgb(hex: string): string | null {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
  if (!m) return null;
  return `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
}

/** Resolve EventTag from scene field */
export function resolveEventTag(scene: string, tags?: string[]): string {
  if (tags?.length) return tags[0];
  if (scene.startsWith('http') || scene.startsWith('/api/media/')) return 'other';
  const sceneToTag: Record<string, string> = {};
  for (const [tag, sk] of Object.entries(eventTagToScene)) sceneToTag[sk] = tag;
  return sceneToTag[scene] ?? 'other';
}
