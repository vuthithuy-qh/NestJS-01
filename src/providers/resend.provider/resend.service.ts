import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}
@Injectable()
export class ResendService {
  private readonly resend: Resend;
  private readonly logger = new Logger(ResendService.name);
  private readonly senderEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    this.senderEmail = this.configService.get<string>(
      'ADMIN_SENDER_EMAIL',
    ) as string;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not defined in environment variables');
    }

    this.resend = new Resend(apiKey);
  }

  async sendEmail({ to, subject, html }: SendEmailOptions) {
    try {
      const data = await this.resend.emails.send({
        from: this.senderEmail,
        to,
        subject,
        html,
      });

      return data;
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }
}
