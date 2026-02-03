import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Country } from './entities/country.entity';
import { Address } from './entities/address.entity';
import { UserAddress } from './entities/user-address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Country, Address, UserAddress])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
