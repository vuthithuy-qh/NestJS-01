import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    UseInterceptors,
    Headers
} from '@nestjs/common';
import {AuthService} from "./auth.service";
import {Public} from "./decorators/public.decorator";
import {RegisterDto} from "./dto/register.dto";
import {AuthResponseDto} from "./dto/auth-response.dto";
import {LoginDto} from "./dto/login.dto";
import {RefreshTokenDto} from "./dto/refresh-token.dto";
import {CurrentUser} from "./decorators/current-user-decorator";
import {User} from "../users/entities/user.entity";
import {ChangePasswordDto} from "./dto/change-password.dto";

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {

    constructor(private readonly authService: AuthService) {
    }

    @Public()
    @Post('register')
    async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto>{
        return this.authService.register(registerDto);
    }


    @Public()
    @Post('login')
    async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto>{
        return this.authService.login(loginDto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Body() refreshTokenDto: RefreshTokenDto){
        return this.authService.refreshToken(refreshTokenDto.refreshToken);
    }

    @Get('profile')
    async getProfile(@CurrentUser() user: User){
        return this.authService.getProfile(user.id);
    }

    @Post('change-password')
    async changePassword(
        @CurrentUser('id') userId: number,
        @Body() changePasswordDto: ChangePasswordDto,
    ){
        return this.authService.changePassword(userId, changePasswordDto);
    }

    @Post('logout')
    async logout(
        @CurrentUser('id') userId: number,
        @Headers('authorization') authorization: string,
    ) {
        const token = authorization?.replace('Bearer ', '');
        return this.authService.logout(userId, token);
    }
}
