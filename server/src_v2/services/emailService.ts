import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env.js';

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

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

  return ses.send(command);
}
