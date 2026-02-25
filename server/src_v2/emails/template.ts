// ── Design tokens ──────────────────────────────────────────
const BG_OUTER  = '#f4f4f5';
const BG_CARD   = '#ffffff';
const CLR_TEXT   = '#18181b';
const CLR_MUTED  = '#71717a';
const CLR_LINK   = '#2563eb';
const CLR_BORDER = '#e4e4e7';

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
 */
export function renderEmail(options: RenderEmailOptions): RenderedEmail {
  const {
    body,
    variables,
    previewText,
    ctaLabel,
    ctaUrl,
    unsubscribeUrl,
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
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${CLR_TEXT};font-family:${FONT_STACK};">${linkify(p.replace(/\n/g, '<br/>'))}</p>`,
    )
    .join('\n');

  // 3. Build HTML email
  const ctaSection =
    ctaLabel && resolvedCtaUrl
      ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;">
              <tr><td align="center">
                <a href="${escapeAttr(resolvedCtaUrl)}" style="display:inline-block;background-color:${CLR_LINK};color:#ffffff;font-size:15px;font-weight:600;font-family:${FONT_STACK};text-decoration:none;padding:12px 32px;border-radius:8px;" target="_blank">${escapeHtml(ctaLabel)}</a>
              </td></tr>
            </table>`
      : '';

  const unsubLine = unsubscribeUrl
    ? `<a href="${escapeAttr(unsubscribeUrl)}" style="color:${CLR_MUTED};text-decoration:underline;">不想收到邮件？点此退订</a><br/>`
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
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_OUTER};">
    <tr><td align="center" style="padding:0;">

      <!-- Main container -->
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td align="center" style="padding:32px 24px 16px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:${CLR_TEXT};font-family:${FONT_STACK};">串门儿</h1>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 24px 24px;">
          <hr style="border:none;border-top:1px solid ${CLR_BORDER};margin:0;"/>
        </td></tr>

        <!-- Body card -->
        <tr><td class="fluid-padding" style="padding:0 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_CARD};border-radius:8px;">
            <tr><td style="padding:24px 24px 8px;">
              ${bodyHtml}
            </td></tr>
          </table>
        </td></tr>

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

// ── Helpers ────────────────────────────────────────────────

/** Turn bare URLs in text into <a> tags (simple heuristic). */
function linkify(html: string): string {
  return html.replace(
    /(?<!="|'>)(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${CLR_LINK}">$1</a>`,
  );
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
  const lines = [`${subject}\n`, body];
  if (ctaLabel && ctaUrl) lines.push(`\n${ctaLabel}: ${ctaUrl}`);
  lines.push('\n---\n串门儿 · Edison, NJ');
  return lines.join('\n');
}
