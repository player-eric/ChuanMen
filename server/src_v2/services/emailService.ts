import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env.js';

function getSesClient(): SESClient {
  if (!env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('SES is not configured — set AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  }
  return new SESClient({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

let _ses: SESClient | null = null;
function ses() {
  if (!_ses) _ses = getSesClient();
  return _ses;
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput) {
  const command = new SendEmailCommand({
    Source: env.AWS_SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [input.to],
    },
    Message: {
      Subject: {
        Data: input.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: input.text,
          Charset: 'UTF-8',
        },
        ...(input.html
          ? {
              Html: {
                Data: input.html,
                Charset: 'UTF-8',
              },
            }
          : {}),
      },
    },
  });

  return ses().send(command);
}
