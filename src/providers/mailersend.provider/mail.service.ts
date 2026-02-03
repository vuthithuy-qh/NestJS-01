import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import { SendMailDto } from './dto/send-mail.dto';
import { SendTemplateMailDto } from './dto/send-template-mail.dto';
import { MAILER_SEND_TEMPLATE_IDS } from 'src/utils/mailerSendTemplate';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailerSend: MailerSend;
  private readonly sendFrom: Sender;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>(
      'MAILER_SEND_API_KEY',
    ) as string;
    const senderEmail = this.configService.get<string>(
      'ADMIN_SENDER_EMAIL',
    ) as string;
    const senderName =
      this.configService.get<string>('ADMIN_SENDER_NAME') || 'Admin';

    this.mailerSend = new MailerSend({ apiKey });
    this.sendFrom = new Sender(senderEmail, senderName);
  }

  async sendEmail(data: SendMailDto) {
    try {
      const recipients = [new Recipient(data.to, data.toName || data.to)];

      const emailParams = new EmailParams()
        .setFrom(this.sendFrom)
        .setTo(recipients)
        .setReplyTo(this.sendFrom)
        .setSubject(data.subject)
        .setHtml(data.html);

      return await this.mailerSend.email.send(emailParams);
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }

  async sendTemplateMail(dto: SendTemplateMailDto) {
    const recipients = [new Recipient(dto.to, dto.toName || dto.to)];

    const emailParams = new EmailParams()
      .setFrom(this.sendFrom)
      .setTo(recipients)
      .setTemplateId(dto.templateId)
      .setPersonalization([
        {
          email: dto.to,
          data: dto.data,
        },
      ]);

    if (dto.subject) {
      emailParams.setSubject(dto.subject);
    }

    return await this.mailerSend.email.send(emailParams);
  }
  catch(error) {
    this.logger.error('Failed to send template email', error);
    throw error;
  }

  async sendRegisterMail(params: {
    to: string;
    name: string;
    accountName: string;
  }) {
    return this.sendTemplateMail({
      to: params.to,
      toName: params.name,
      templateId: MAILER_SEND_TEMPLATE_IDS.REGISTER_ACCOUNT,
      subject: 'Welcome to Pet Shop!',
      data: {
        name: params.name,
        account_name: params.accountName,
      },
    });
  }
}
