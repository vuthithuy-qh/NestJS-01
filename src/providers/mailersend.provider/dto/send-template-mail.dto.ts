import { BaseMailDto } from './base-mail.dto';

export class SendTemplateMailDto extends BaseMailDto {
  subject?: string;
  templateId: string;
  data: Record<string, any>;
}
