import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../users/users.service';
import { TokenBlacklist } from '../entities/token-blacklist.entity';

export interface JwtPayload {
    sub: number;
    email: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private usersService: UsersService,
        private configService: ConfigService,
        @InjectRepository(TokenBlacklist)
        private tokenBlacklistRepository: Repository<TokenBlacklist>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
            passReqToCallback: true, // : Để nhận request object
        });
    }

    async validate(request: any, payload: JwtPayload) {
        // 1. Lấy token từ header
        const authHeader = request.headers.authorization;
        const token = authHeader?.replace('Bearer ', '').trim();

        if (!token) {
            throw new UnauthorizedException('Token not found');
        }

        console.log('JWT Strategy - Validating token (first 20 chars):', token.substring(0, 20) + '...');

        // 2. Kiểm tra token có trong blacklist không
        const isBlacklisted = await this.tokenBlacklistRepository.findOne({
            where: { token },
        });

        if (isBlacklisted) {
            console.log(' Token is blacklisted - logged out');
            throw new UnauthorizedException('Token has been revoked. Please login again.');
        }

        console.log('Token is valid - not in blacklist');

        // 3. Lấy user từ database
        const user = await this.usersService.findOne(payload.sub);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // 4. Kiểm tra user có active không
        if (!user.isActive) {
            throw new UnauthorizedException('User account is disabled');
        }

        console.log(' User validated:', user.email);

        // 5. Return user → NestJS gán vào request.user
        return user;
    }
}