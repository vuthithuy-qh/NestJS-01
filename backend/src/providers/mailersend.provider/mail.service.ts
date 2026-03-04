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
      // xu ly attachment neu co

      // if (data.attachmentPath) {
      //   const fileBuffer = fs.readFileSync(data.attachmentPath);

      //   // mailersend yeu cau o dang base64
      //   const base64File = fileBuffer.toString('base64');

      //   /** Tao attachment
      //    * - base64File : Noi dung file
      //    * -fileName: ten hien thi trong email
      //    * -disposition: 'attachment' de dinh dang la file dinh kem
      //    */

      //   const attachment = new Attachment(
      //     base64File,
      //     data.attachmentName || 'file',
      //     'attachment',
      //   );

      //   /**
      //    * Gắn attachment vào email
      //    */
      //   emailParams.setAttachments([attachment]); //emailParams.setAttachments([attachment1, attachment2]);
      //   // Neu co nhieu file dinh kem
      // }
      return await this.mailerSend.email.send(emailParams);
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }

  async sendTemplateMail(dto: SendTemplateMailDto) {
    try {
      const recipients = [new Recipient(dto.to, dto.toName || dto.to)];

      const emailParams = new EmailParams()
        .setFrom(this.sendFrom)
        .setTo(recipients)
        .setTemplateId(dto.templateId)
        .setPersonalization([
          {
            email: dto.to,
            data: dto.data, // bien truyen vao template
          },
        ]);

      if (dto.subject) {
        emailParams.setSubject(dto.subject);
      }

      // if (dto.sendAt) {
      //   const sendAtUnix = Math.floor(dto.sendAt.getTime() / 1000);
      //   emailParams.setSendAt(sendAtUnix);
      // }

      if (dto.sendAt) {
        this.logger.warn(
          'sendAt is ignored because MailerSend Free plan does not support scheduled emails',
        );
      }
      // if (dto.attachmentPath) {
      //   const fileBuffer = fs.readFileSync(dto.attachmentPath);
      //   const base64File = fileBuffer.toString('base64');

      //   const attachments = [
      //     {
      //       content: base64File,
      //       filename: dto.attachmentName || 'attachment.pdf',
      //       disposition: 'attachment',
      //     },
      //   ];

      //   emailParams.setAttachments(attachments);
      // }
      //Dich vu cua mailser send email
      return await this.mailerSend.email.send(emailParams);
    } catch (error) {
      this.logger.error('Failed to send template email', error);
      throw error;
    }
  }

  async sendRegisterMail(params: {
    to: string;
    name: string;
    accountName: string;
    sendAt?: Date;
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
      sendAt: params.sendAt,
      // attachmentPath:
      //   'E:\\javascript\\PetShop\\pet-shop-01\\uploads\\welcome-guide.pdf',
      // attachmentName: 'welcome-guide.pdf',
    });
  }

  // async sendScheduledTemplateMail(dto: SendTemplateMailDto, sendAt: Date) {
  //   try {
  //     const recipients = [new Recipient(dto.to, dto.toName || dto.to)];

  //     const sendAtUnix = Math.floor(sendAt.getTime() / 1000);

  //     const emailParams = new EmailParams()
  //       .setFrom(this.sendFrom)
  //       .setTo(recipients)
  //       .setTemplateId(dto.templateId)
  //       .setPersonalization([
  //         {
  //           email: dto.to,
  //           data: dto.data, //
  //         },
  //       ])
  //       .setSendAt(sendAtUnix); // thoi gian gui dinh ky

  //     if (dto.subject) {
  //       emailParams.setSubject(dto.subject);
  //     }
  //     return await this.mailerSend.email.send(emailParams);
  //   } catch (error) {
  //     this.logger.error('Failed to send scheduled template email', error);
  //     throw error;
  //   }
  // }
}
