import {
    Body, ClassSerializerInterceptor,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseInterceptors
} from '@nestjs/common';
import {UsersService} from "./users.service";
import {CreateUserDto} from "./dto/create-user.dto";
import {FilterUserDto} from "./dto/filter-user.dto";
import {UpdateUserDto} from "../cats/dto/update-user.dto";
import {Roles} from "../auth/decorators/roles.decorator";
import {UserRole} from "./enum/user-role.enum";
import {CurrentUser} from "../auth/decorators/current-user-decorator";

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
    constructor(private readonly usersService: UsersService) {
    }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto)
    }

    @Get()
    @Roles(UserRole.ADMIN)
    findAll(@Query() filterDto: FilterUserDto) {
        return this.usersService.findAll(filterDto);
    }

    @Get('count')
    @Roles(UserRole.ADMIN)
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(+id);
    }

    @Patch('me')
    updateMyProfile(@CurrentUser('id') userId: number, @Body() updateUserDto: UpdateUserDto) {
        const {role, isActive, ...safeUpdates} = updateUserDto;
        return this.usersService.update(userId, safeUpdates);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(+id, updateUserDto);
    }



    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    remove(@Param('id') id: string) {
        return this.usersService.remove(+id);
    }

    @Post(':id/restore')
    @Roles(UserRole.ADMIN)
    restore(@Param('id') id: string) {
        return this.usersService.restore(+id);
    }

    @Delete(':id/hard')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    hardDelete(@Param('id') id: string) {
        return this.usersService.hardDelete(+id);
    }
}
