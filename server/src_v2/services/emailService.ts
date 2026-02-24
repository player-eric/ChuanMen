import { Resend } from 'resend';
import { env } from '../config/env.js';

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
