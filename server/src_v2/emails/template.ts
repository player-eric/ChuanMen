const LOGO_URL = 'https://chuanmener.club/logo.png';

// ── Design tokens (dark/gold, matching cDark theme) ────────
const BG_OUTER  = '#0C0C0E';
const BG_CARD   = '#1C1C1F';
const CLR_TEXT   = '#E8E6E2';
const CLR_MUTED  = '#5A5854';
const CLR_TEXT2  = '#9A9894';
const CLR_BRAND  = '#D4A574';
const CLR_LINK   = '#D4A574';
const CLR_BORDER = '#2A2A2F';

// SVG noise overlay (feTurbulence, same as AppLayout)
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif";

// ── Public API ─────────────────────────────────────────────

export interface RenderEmailOptions {
  subject: string;
  body: string;
  variables: Record<string, string>;
  previewText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl?: string;
  /** Raw HTML block inserted between body text and CTA button */
  htmlBlock?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render a branded email from a template subject/body + variables.
 *
 * 1. Replace `{key}` placeholders in subject + body
 * 2. Convert body text to HTML paragraphs (\n\n → sections, \n → <br/>)
 * 3. Build responsive HTML email (table-based, no MJML dependency)
 * 4. Generate plain-text fallback
 *
 * Supports markdown-style links: [label](url) → clickable <a> tags.
 */
export function renderEmail(options: RenderEmailOptions): RenderedEmail {
  const {
    body,
    variables,
    previewText,
    ctaLabel,
    ctaUrl,
    unsubscribeUrl,
    htmlBlock,
  } = options;

  // 1. Variable substitution
  const sub = (text: string) =>
    text.replace(/\{(\w+)\}/g, (_, key: string) => variables[key] ?? `{${key}}`);

  const subject = sub(options.subject);
  const resolvedBody = sub(body);
  const resolvedCtaUrl = ctaUrl ? sub(ctaUrl) : undefined;

  // 2. Convert body to HTML paragraphs
  const paragraphs = resolvedBody
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${CLR_TEXT};font-family:${FONT_STACK};">${richify(p)}</p>`,
    )
    .join('\n');

  // 3. Build HTML email (dark/gold theme with lofi noise)
  const ctaSection =
    ctaLabel && resolvedCtaUrl
      ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
              <tr><td align="center">
                <a href="${escapeAttr(resolvedCtaUrl)}" style="display:inline-block;background-color:${CLR_BRAND};color:#0C0C0E;font-size:15px;font-weight:600;font-family:${FONT_STACK};text-decoration:none;padding:12px 32px;border-radius:8px;" target="_blank">${escapeHtml(ctaLabel)}</a>
              </td></tr>
            </table>`
      : '';

  const unsubLine = unsubscribeUrl
    ? `<a href="${escapeAttr(unsubscribeUrl)}" style="color:${CLR_TEXT2};text-decoration:underline;">不想收到邮件？点此退订</a><br/>`
    : '';

  const previewHidden = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(sub(previewText))}${'&zwnj;&nbsp;'.repeat(40)}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="zh" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]><style>table,td{font-family:Arial,'Noto Sans SC',sans-serif!important;}</style><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0;mso-table-rspace:0;}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
    a{color:${CLR_LINK};text-decoration:none;}
    a:hover{text-decoration:underline;}
    @media only screen and (max-width:600px){
      .email-container{width:100%!important;max-width:100%!important;}
      .fluid-padding{padding-left:16px!important;padding-right:16px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG_OUTER};font-family:${FONT_STACK};">
  ${previewHidden}
  <!--[if !mso]><!--><div style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;opacity:0.12;background-image:${NOISE_SVG};background-repeat:repeat;background-size:200px 200px;"></div><!--<![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_OUTER};" bgcolor="${BG_OUTER}">
    <tr><td align="center" style="padding:0;">

      <!-- Main container -->
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td align="center" style="padding:32px 24px 16px;">
          <img src="${LOGO_URL}" alt="串门儿" width="32" height="32" style="display:block;margin:0 auto 8px;width:32px;height:32px;" />
          <h1 style="margin:0;font-size:22px;font-weight:700;color:${CLR_BRAND};font-family:${FONT_STACK};">串门儿</h1>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 24px 24px;">
          <hr style="border:none;border-top:1px solid ${CLR_BORDER};margin:0;"/>
        </td></tr>

        <!-- Body card -->
        <tr><td class="fluid-padding" style="padding:0 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_CARD};border-radius:12px;border:1px solid ${CLR_BORDER};" bgcolor="${BG_CARD}">
            <tr><td style="padding:24px 24px 8px;">
              ${bodyHtml}
            </td></tr>
          </table>
        </td></tr>
${htmlBlock ? `
        <!-- Custom HTML block -->
        <tr><td class="fluid-padding" style="padding:16px 24px 0;">
          ${htmlBlock}
        </td></tr>
` : ''}
        <!-- CTA -->${ctaSection}

        <!-- Footer divider -->
        <tr><td style="padding:24px 24px 16px;">
          <hr style="border:none;border-top:1px solid ${CLR_BORDER};margin:0;"/>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:0 24px 32px;">
          <p style="margin:0;font-size:12px;color:${CLR_MUTED};line-height:1.5;font-family:${FONT_STACK};">
            ${unsubLine}串门儿 · Edison, NJ
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // 4. Plain-text fallback
  const text = buildPlainText(subject, resolvedBody, ctaLabel, resolvedCtaUrl);

  return { subject, html, text };
}

// ── Postcard block ─────────────────────────────────────────

export interface PostcardBlockOptions {
  fromName: string;
  toName: string;
  message: string;
  date: string;
  eventCtx?: string;
  /** Stamp emoji (default ✉) */
  stamp?: string;
  /** Stamp label text shown beside the emoji, e.g. "气氛组长" */
  stampLabel?: string;
  /** Photo URL for banner background (replaces default gradient) */
  photo?: string;
}

/**
 * Render a visual postcard card matching the frontend PostCard horizontal layout.
 * Pure table-based HTML — no flex/aspect-ratio (Gmail strips those).
 */
export function renderPostcardBlock(opts: PostcardBlockOptions): string {
  const { fromName, toName, message, date, eventCtx, stamp = '✉', stampLabel, photo } = opts;
  const initial = fromName.charAt(0);
  const hue = fromName.charCodeAt(0) * 37 % 360;

  const wmBottom = eventCtx ? '26px' : '10px';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;border-collapse:separate;" bgcolor="#1E1C1A">
  <tr>
    <!-- Left: banner 45% -->
    <td width="45%" valign="top" bgcolor="#2a2018" style="${photo ? `background-image:url('${escapeAttr(photo)}');background-size:cover;background-position:center;` : 'background:linear-gradient(145deg,#1c1814 0%,#2a2018 25%,#3a2a20 50%,#2a2218 75%,#1c1814 100%);'}">
      <div style="height:240px;position:relative;overflow:hidden;">${!photo ? `
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,#D4A574 0%,#C4915A 40%,#B07D48 100%);"></div>
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;opacity:0.4;background-image:url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%271.2%27 numOctaves=%275%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E');background-repeat:repeat;background-size:100px 100px;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
          <div style="font-size:20px;font-style:italic;font-weight:600;color:rgba(255,255,255,0.55);letter-spacing:0.05em;font-family:Georgia,'Noto Serif SC',serif;">Thank You</div>
        </div>` : ''}
        <table role="presentation" cellpadding="0" cellspacing="0" style="position:absolute;bottom:${wmBottom};right:8px;opacity:0.25;">
          <tr>
            <td style="width:14px;height:14px;border-radius:3px;background:rgba(224,216,206,0.09);text-align:center;vertical-align:middle;font-size:7px;font-weight:800;color:rgba(224,216,206,0.38);line-height:14px;">串</td>
            <td style="padding-left:3px;font-size:9px;font-weight:600;letter-spacing:0.06em;color:rgba(224,216,206,0.31);font-family:${FONT_STACK};">CHUANMEN</td>
            <td style="padding-left:3px;font-size:9px;font-weight:600;color:rgba(224,216,206,0.25);font-family:${FONT_STACK};">${escapeHtml(date)}</td>
          </tr>
        </table>${eventCtx ? `
        <div style="position:absolute;bottom:8px;left:8px;right:8px;font-size:10px;color:#ffffff;opacity:0.85;text-shadow:0 1px 4px rgba(0,0,0,0.7);font-family:${FONT_STACK};">&#x1F4CD; ${escapeHtml(eventCtx)}</div>` : ''}
      </div>
    </td>
    <!-- Right: content 55% -->
    <td width="55%" valign="top" bgcolor="#1E1C1A" style="background:linear-gradient(165deg,#1E1C1A,#161412);padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="height:240px;">
        <tr>
          <td valign="top" style="padding:12px 14px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="top" style="font-size:10px;letter-spacing:0.08em;color:#9A9088;text-transform:uppercase;font-family:${FONT_STACK};padding:0;">TO: ${escapeHtml(toName)}</td>
                <td valign="top" align="right" style="padding:0;white-space:nowrap;">
                  <div style="display:inline-block;width:22px;height:27px;border-radius:2px;border:1.5px solid #D4A574;background:linear-gradient(160deg,#0C0C0E,rgba(212,165,116,0.21));text-align:center;line-height:27px;font-size:12px;vertical-align:middle;">${escapeHtml(stamp)}</div>${stampLabel ? `<span style="font-size:10px;font-weight:600;color:#D4A574;vertical-align:middle;margin-left:4px;font-family:${FONT_STACK};">${escapeHtml(stampLabel)}</span>` : ''}
                </td>
              </tr>
            </table>
            <p style="margin:6px 0 0;font-size:15px;font-style:italic;line-height:1.7;color:#E0D8CE;font-family:Georgia,'Noto Serif SC',serif;">${escapeHtml(message)}</p>
          </td>
        </tr>
        <tr>
          <td valign="bottom" style="padding:0 14px 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle" style="font-size:13px;font-weight:600;color:#E0D8CE;font-family:${FONT_STACK};padding:0;">
                  <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:hsl(${hue},25%,22%);vertical-align:middle;margin-right:4px;text-align:center;line-height:18px;font-size:7px;color:#9A9894;font-weight:600;">${escapeHtml(initial)}</span>${escapeHtml(fromName)}
                </td>
                <td valign="middle" align="right" style="font-size:11px;color:rgba(154,144,136,0.5);font-family:${FONT_STACK};padding:0;">${escapeHtml(date)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ── Digest block ──────────────────────────────────────────

export interface DigestSection {
  icon: string;
  title: string;
  items: { text: string; url?: string }[];
}

/**
 * Render a styled digest block with grouped sections.
 * Each section has an icon, title, and list of items.
 */
export function renderDigestBlock(sections: DigestSection[]): string {
  const rows = sections.map((s) => {
    const items = s.items.map((item) => {
      const label = item.url
        ? `<a href="${escapeAttr(item.url)}" style="color:${CLR_LINK};text-decoration:none;">${escapeHtml(item.text)}</a>`
        : escapeHtml(item.text);
      return `<tr><td style="padding:4px 0 4px 8px;font-size:14px;line-height:1.5;color:${CLR_TEXT};font-family:${FONT_STACK};">· ${label}</td></tr>`;
    }).join('\n');

    return `<tr><td style="padding:12px 0 4px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:16px;vertical-align:middle;padding-right:6px;">${s.icon}</td>
        <td style="font-size:13px;font-weight:700;color:${CLR_BRAND};text-transform:uppercase;letter-spacing:0.04em;font-family:${FONT_STACK};">${escapeHtml(s.title)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 0 0 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
    </td></tr>
    <tr><td style="padding:8px 0 0;"><hr style="border:none;border-top:1px solid ${CLR_BORDER};margin:0;"/></td></tr>`;
  });

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG_CARD};border-radius:12px;border:1px solid ${CLR_BORDER};padding:8px 16px 4px;" bgcolor="${BG_CARD}">
  ${rows.join('\n')}
</table>`;
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Convert a plain-text paragraph to safe HTML with:
 * 1. HTML-escape dangerous chars
 * 2. Convert [label](url) markdown links to <a> tags
 * 3. Convert bare URLs to <a> tags
 * 4. Convert \n to <br/>
 */
function richify(p: string): string {
  // Escape HTML first
  let html = escapeHtml(p);
  // Convert markdown links: [label](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    `<a href="$2" style="color:${CLR_LINK};text-decoration:underline;">$1</a>`,
  );
  // Convert bare URLs (that aren't already inside an href)
  html = html.replace(
    /(?<!="|">)(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${CLR_LINK}">$1</a>`,
  );
  // Line breaks
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPlainText(
  subject: string,
  body: string,
  ctaLabel?: string,
  ctaUrl?: string,
): string {
  // Strip markdown links to plain text: [label](url) → label (url)
  const plainBody = body.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');
  const lines = [`${subject}\n`, plainBody];
  if (ctaLabel && ctaUrl) lines.push(`\n${ctaLabel}: ${ctaUrl}`);
  lines.push('\n---\n串门儿 · Edison, NJ');
  return lines.join('\n');
}
