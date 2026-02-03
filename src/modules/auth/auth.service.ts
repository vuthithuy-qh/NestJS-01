import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserRole } from '../users/enum/user-role.enum';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { LessThan, Repository } from 'typeorm';
import { ResendService } from 'src/providers/resend.provider/resend.service';
import { MailService } from 'src/providers/mailersend.provider/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private resendService: ResendService,
    private mailService: MailService,
    @InjectRepository(TokenBlacklist)
    private tokenBlacklistRepository: Repository<TokenBlacklist>,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      await this.usersService.findByEmail(registerDto.email);
      throw new ConflictException('Email already in use');
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      //email chua ton tai, tiep tuc tao user
    }

    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.USER,
    });

    console.log('Registered user email  :', user.email);

    //Tao token
    const tokens = await this.generateTokens(user);
    const to = user.email;
    const subject = 'Welcome to Pet Shop!';
    const html = `<h1>Welcome to Pet Shop, ${user.fullName}!</h1>
                      <p>Thank you for registering with us. We're excited to have you on board!</p>`;

    //Gui email su dung ResendProvider

    const sendEmailResponse = await this.mailService.sendRegisterMail({
      to: user.email,
      name: user.fullName,
      accountName: 'Pet-Shop Vu',
    });

    console.log('Email sent successfully:', sendEmailResponse);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been disabled');
    }

    // Tạo tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    let user: User;

    try {
      user = await this.usersService.findByEmail(email);
    } catch (error) {
      throw new UnauthorizedException('Invalid email ');
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return user;
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Kiểm tra refresh token có bị blacklist không
      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findOne(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);

    const isOldPasswordValid = await user.comparePassword(
      changePasswordDto.oldPassword,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    await this.usersService.update(userId, {
      password: changePasswordDto.newPassword,
    });

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') as any, // Ép kiểu ở đây
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ) as any, // Và ở đây
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async getProfile(userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }

  async logout(userId: number, token: string): Promise<{ message: string }> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      console.log(decoded);
      const expiresAt = new Date(decoded.exp * 1000);

      await this.tokenBlacklistRepository.save({
        token,
        userId,
        expiresAt,
      });

      return {
        message: 'Logout successful',
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Invalid token');
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blackListed = await this.tokenBlacklistRepository.findOne({
      where: { token },
    });

    return !!blackListed;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.tokenBlacklistRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
