import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryItem {
  @IsString()
  role: 'user' | 'model';

  @IsString()
  text: string;
}

export class ChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItem)
  history?: ChatHistoryItem[];
}
