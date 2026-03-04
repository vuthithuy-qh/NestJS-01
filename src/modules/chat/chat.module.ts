import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Cat } from '../cats/entities/cat.entity';
import { Category } from '../category/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cat, Category])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
