import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import {typeOrmConfig} from "./beyond/config/database.config";
import { CatsModule } from './cats/cats.module';
import {CategoryModule} from "./category/category.module";
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import {APP_GUARD} from "@nestjs/core";
import {JwtAuthGuard} from "./auth/guards/jwt-auth.guard";
import {RolesGuard} from "./auth/guards/roles.guard";
import { ShoppingCartModule } from './shopping-cart/shopping-cart.module';
import { PromotionModule } from './promotion/promotion.module';

@Module({
  imports: [
      ConfigModule.forRoot({
          isGlobal: true,
      }),
      TypeOrmModule.forRootAsync(typeOrmConfig),
      CatsModule, CategoryModule, UsersModule, AuthModule, ShoppingCartModule, PromotionModule
  ],
  controllers: [AppController],
  providers: [
      {
          provide: APP_GUARD,
          useClass: JwtAuthGuard, //tat ca cac route deu can authentication tru @Public(
      },

      {
          provide: APP_GUARD,
          useClass: RolesGuard, //tat ca cac route deu can kiem tra role tru @Public(
      }, AppService
  ],
})
export class AppModule {}
