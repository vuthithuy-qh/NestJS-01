import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/enum/user-role.enum';

export class AuthResponseDto {
    @ApiProperty()
    accessToken: string;

    @ApiProperty()
    refreshToken: string;

    @ApiProperty()
    user: {
        id: number;
        email: string;
        fullName: string;
        role: UserRole;
    };
}