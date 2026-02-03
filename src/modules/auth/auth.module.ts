import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { StringValue } from 'ms';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResendModule } from 'src/providers/resend.provider/resend.modules';
import { MailModule } from 'src/providers/mailersend.provider/mail.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([TokenBlacklist]),
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService], // ← Phải có dòng này TRƯỚC useFactory
      useFactory: (configService: ConfigService) => ({
        // ← Bỏ async nếu không cần
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<StringValue>('JWT_EXPIRES_IN') || '7d',
        },
      }),
    }),
    ResendModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
