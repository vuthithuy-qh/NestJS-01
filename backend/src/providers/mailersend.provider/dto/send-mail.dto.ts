import { BaseMailDto } from './base-mail.dto';

export class SendMailDto extends BaseMailDto {
  subject: string;
  html: string;
  attachmentPath?: string;
  attachmentName?: string;
}
