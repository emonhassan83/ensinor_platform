import { SendEmailCommand } from '@aws-sdk/client-ses';
import { sesClient } from '../constants/sesClient';
import config from '../config/index';

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const command = new SendEmailCommand({
    Source: config.ses.email,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
        Text: {
          Data: text || '',
          Charset: 'UTF-8',
        },
      },
    },
  });

  return await sesClient.send(command);
};
