// mlsn.c05ff75bfd449226194d1ecaa53a2d0d74ad2a2ad366055dc8725286e388f8b7;

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const MAILER_SEND_API_KEY =
  process.env.MAILER_SEND_API_KEY ||
  'mlsn.c05ff75bfd449226194d1ecaa53a2d0d74ad2a2ad366055dc8725286e388f8b7';

const ADMIN_SENDER_EMAIL =
  process.env.ADMIN_SENDER_EMAIL || 'thuyvu@test-3m5jgroyyr0gdpyo.mlsender.net';
const ADMIN_SENDER_NAME = process.env.ADMIN_SENDER_NAME || 'ThuyVu';

const mailersendInstance = new MailerSend({
  apiKey: MAILER_SEND_API_KEY,
});

//Tao bien sendFrom: nguoi gui email

const sendFrom = new Sender(ADMIN_SENDER_EMAIL, ADMIN_SENDER_NAME);
const sendEmail = async ({ to, toName, subject, html }) => {
  try {
    const recipients = [new Recipient(to, toName)];

    const emailParams = new EmailParams()
      .setFrom(sendFrom)
      .setTo(recipients)
      .setReplyTo(sendFrom)
      .setSubject(subject)
      .setHtml(html);

    const data = await mailersendInstance.email.send(emailParams);
    return data;
  } catch (error) {
    console.error('Failed to send email', error);
    throw error;
  }
};
