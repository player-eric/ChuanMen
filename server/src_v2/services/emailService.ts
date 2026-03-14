import type { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import { env } from '../config/env.js';
import { renderEmail } from '../emails/template.js';

let _resend: Resend | null = null;
function resend(): Resend {
  if (!_resend) {
    if (!env.RESEND_API_KEY) throw new Error('Resend is not configured — set RESEND_API_KEY');
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

type SendEmailInput = { to: string; subject: string; text: string; html?: string };

export async function sendEmail(input: SendEmailInput) {
  if (!env.RESEND_API_KEY) {
    console.log(`[EMAIL BLOCKED] (no RESEND_API_KEY) to: ${input.to}, subject: ${input.subject}`);
    return { MessageId: `blocked-${Date.now()}` };
  }
  const { data, error } = await resend().emails.send({
    from: env.RESEND_FROM_EMAIL,
    replyTo: env.RESEND_REPLY_TO,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    ...(input.html ? { html: input.html } : {}),
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return { MessageId: data!.id };
}

// ── Templated email ────────────────────────────────────────

export interface SendTemplatedEmailOptions {
  to: string;
  ruleId: string;
  variantKey?: string;
  variables: Record<string, string>;
  previewText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Raw HTML block inserted between body text and CTA button */
  htmlBlock?: string;
}

export async function sendTemplatedEmail(
  prisma: PrismaClient,
  options: SendTemplatedEmailOptions,
): Promise<{ MessageId: string }> {
  const { to, ruleId, variantKey = 'default', variables, previewText, ctaLabel, ctaUrl, htmlBlock } = options;

  const template = await prisma.emailTemplate.findUnique({
    where: { ruleId_variantKey: { ruleId, variantKey } },
  });

  if (!template) {
    // Fallback: send a plain-text email with ruleId as subject
    return sendEmail({ to, subject: ruleId, text: JSON.stringify(variables) });
  }

  const rendered = renderEmail({
    subject: template.subject,
    body: template.body,
    variables,
    previewText,
    ctaLabel,
    ctaUrl,
    htmlBlock,
  });

  return sendEmail({
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
