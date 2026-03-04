import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Public()
  async chat(@Body() dto: ChatMessageDto) {
    return this.chatService.chat(dto);
  }
}
