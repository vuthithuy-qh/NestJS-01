import { Module } from '@nestjs/common';
import { GhnController } from './ghn.controller';
import { GhnService } from './ghn.service';

@Module({
  controllers: [GhnController],
  providers: [GhnService],
  exports: [GhnService],
})
export class GhnModule {}
