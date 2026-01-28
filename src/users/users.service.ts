import {BadRequestException, ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {User} from "./entities/user.entity";
import {Repository} from "typeorm";
import {CreateUserDto} from "./dto/create-user.dto";
import {FilterUserDto} from "./dto/filter-user.dto";
import {PaginatedUserResponse} from "./dto/paginated-user-response";
import {UpdateUserDto} from "../cats/dto/update-user.dto";

@Injectable()
export class UsersService {

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<User>{
        const existingUser = await this.userRepository.findOne({
            where: {email: createUserDto.email},
            withDeleted: true,
        })

        if(existingUser){
            throw new ConflictException('Email already in use');
        }

        const user = this.userRepository.create(createUserDto);
        return await this.userRepository.save(user);
    }

    async findAll(filterDto: FilterUserDto): Promise<PaginatedUserResponse>{
        const {
            role, isActive,search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC',
        } = filterDto;

        const queryBuilder = this.userRepository.createQueryBuilder('user');
        if (role) {
            queryBuilder.andWhere('user.role = :role', { role });
        }

        if (isActive !== undefined) {
            queryBuilder.andWhere('user.isActive = :isActive', { isActive });
        }

        if (search) {
            queryBuilder.andWhere(
                '(user.fullName LIKE :search OR user.email LIKE :search OR user.phone LIKE :search)',
                { search: `%${search}%` },
            );
        }

        // Pagination
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        // Sorting
        queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async findByEmail(email: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new NotFoundException(`User with email ${email} not found`);
        }

        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);

        // Kiểm tra email mới có bị trùng không
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.userRepository.findOne({
                where: { email: updateUserDto.email },
            });

            if (existingUser) {
                throw new ConflictException('Email already exists');
            }
        }

        Object.assign(user, updateUserDto);

        return await this.userRepository.save(user);
    }


    async remove(id: number): Promise<{ message: string }> {
        const user = await this.findOne(id);
        await this.userRepository.softRemove(user);

        return { message: `User with ID ${id} has been soft deleted` };
    }

    async restore(id: number): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
            withDeleted: true,
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (!user.deletedAt) {
            throw new BadRequestException(`User with ID ${id} is not deleted`);
        }

        await this.userRepository.restore(id);

        return this.findOne(id);
    }

    async hardDelete(id: number): Promise<{ message: string }> {
        const user = await this.userRepository.findOne({
            where: { id },
            withDeleted: true,
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        await this.userRepository.remove(user);

        return { message: `User with ID ${id} has been permanently deleted` };
    }

    async count() : Promise<{total: number; admins: number; users: number; active: number; inactive: number}>{
        const total = await this.userRepository.count();
        const admins = await this.userRepository.count({where: {role: 'admin' as any}});
        const users = await this.userRepository.count({where: {role: 'user' as any}});
        const active = await this.userRepository.count({where: {isActive: true}});
        const inactive = await this.userRepository.count({where: {isActive: false}});

        return {total, admins, users, active, inactive};
    }



}
