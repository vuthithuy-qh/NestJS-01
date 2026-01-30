import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import {typeOrmConfig} from "./database/database.config";
import {CatsModule} from './modules/cats/cats.module';
import {CategoryModule} from "./modules/category/category.module";
import {UsersModule} from './modules/users/users.module';
import {AuthModule} from './modules/auth/auth.module';
import {APP_GUARD} from "@nestjs/core";
import {JwtAuthGuard} from "./modules/auth/guards/jwt-auth.guard";
import {RolesGuard} from "./modules/auth/guards/roles.guard";
import {ShoppingCartModule} from './modules/shopping-cart/shopping-cart.module';
import {PromotionModule} from './modules/promotion/promotion.module';

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
