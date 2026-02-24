import mjml2html from 'mjml';

// ── Design tokens ──────────────────────────────────────────
const BG_OUTER  = '#f4f4f5';
const BG_CARD   = '#ffffff';
const CLR_TEXT   = '#18181b';
const CLR_MUTED  = '#71717a';
const CLR_LINK   = '#2563eb';
const CLR_BORDER = '#e4e4e7';

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
 * 2. Convert body text to MJML paragraphs (\n\n → sections, \n → <br/>)
 * 3. Compile MJML → responsive HTML
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

  // 2. Convert body to MJML paragraphs
  const paragraphs = resolvedBody
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyMjml = paragraphs
    .map(
      (p) =>
        `<mj-text font-size="15px" line-height="1.6" color="${CLR_TEXT}" padding="0 0 16px 0">${linkify(p.replace(/\n/g, '<br/>'))}</mj-text>`,
    )
    .join('\n          ');

  // 3. Build MJML document
  const ctaSection =
    ctaLabel && resolvedCtaUrl
      ? `
        <mj-section padding="0 24px 8px">
          <mj-column>
            <mj-button
              background-color="${CLR_LINK}"
              color="#ffffff"
              font-size="15px"
              font-weight="600"
              border-radius="8px"
              inner-padding="12px 32px"
              href="${escapeAttr(resolvedCtaUrl)}"
            >${escapeHtml(ctaLabel)}</mj-button>
          </mj-column>
        </mj-section>`
      : '';

  const unsubSection = unsubscribeUrl
    ? `<a href="${escapeAttr(unsubscribeUrl)}" style="color:${CLR_MUTED};text-decoration:underline;">不想收到邮件？点此退订</a><br/>`
    : '';

  const previewMjml = previewText
    ? `<mj-preview>${escapeHtml(sub(previewText))}</mj-preview>`
    : '';

  const mjmlString = `
<mjml>
  <mj-head>
    ${previewMjml}
    <mj-attributes>
      <mj-all font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif" />
      <mj-text padding="0" />
    </mj-attributes>
    <mj-style>
      a { color: ${CLR_LINK}; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </mj-style>
  </mj-head>
  <mj-body background-color="${BG_OUTER}">
    <!-- Header -->
    <mj-section padding="32px 24px 16px">
      <mj-column>
        <mj-text font-size="22px" font-weight="700" color="${CLR_TEXT}" align="center">串门儿</mj-text>
      </mj-column>
    </mj-section>

    <mj-section padding="0 24px">
      <mj-column>
        <mj-divider border-color="${CLR_BORDER}" border-width="1px" padding="0 0 24px" />
      </mj-column>
    </mj-section>

    <!-- Body -->
    <mj-section background-color="${BG_CARD}" padding="24px 24px 8px" border-radius="8px">
      <mj-column>
        ${bodyMjml}
      </mj-column>
    </mj-section>

    <!-- CTA -->${ctaSection}

    <!-- Footer -->
    <mj-section padding="24px 24px 8px">
      <mj-column>
        <mj-divider border-color="${CLR_BORDER}" border-width="1px" padding="0 0 16px" />
      </mj-column>
    </mj-section>

    <mj-section padding="0 24px 32px">
      <mj-column>
        <mj-text font-size="12px" color="${CLR_MUTED}" align="center" line-height="1.5">
          ${unsubSection}串门儿 · Edison, NJ
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  const { html, errors } = mjml2html(mjmlString, { validationLevel: 'soft' });
  if (errors.length > 0) {
    console.warn('[email-template] MJML warnings:', errors.map((e) => e.message));
  }

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
