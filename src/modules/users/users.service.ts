import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { Country } from './entities/country.entity';
import { Address } from './entities/address.entity';
import { UserAddress } from './entities/user-address.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { PaginatedUserResponse } from './dto/paginated-user-response';
import { UpdateUserDto } from '../cats/dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,

    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,

    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
  ) {}

  // ================= CREATE USER =================
  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }

  // ================= FIND ALL =================
  async findAll(filter: FilterUserDto): Promise<PaginatedUserResponse> {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filter;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.addresses', 'ua')
      .leftJoinAndSelect('ua.address', 'address')
      .leftJoinAndSelect('address.country', 'country');

    if (role) qb.andWhere('user.role = :role', { role });
    if (isActive !== undefined)
      qb.andWhere('user.isActive = :isActive', { isActive });

    if (search) {
      qb.andWhere(
        '(user.fullName LIKE :s OR user.email LIKE :s OR user.phone LIKE :s)',
        { s: `%${search}%` },
      );
    }

    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy(`user.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    const [users, total] = await qb.getManyAndCount();

    const data = users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      addresses: user.addresses.map((ua) => ({
        id: ua.address.id,
        unit_number: ua.address.unit_number,
        street_number: ua.address.street_number,
        address_line1: ua.address.address_line1,
        address_line2: ua.address.address_line2,
        city: ua.address.city,
        region: ua.address.region,
        postal_code: ua.address.postal_code,
        country: ua.address.country.country_name,
      })),
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ================= UPDATE =================
  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (exists) throw new ConflictException('Email already exists');
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  // ================= DELETE =================
  async remove(id: number) {
    const user = await this.findOne(id);
    await this.userRepository.softRemove(user);
    return { message: 'User deleted' };
  }

  async restore(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!user || !user.deletedAt)
      throw new BadRequestException('User not deleted');

    await this.userRepository.restore(id);
    return this.findOne(id);
  }

  async hardDelete(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepository.remove(user);
    return { message: 'User permanently deleted' };
  }

  // ================= ADD ADDRESS =================
  async addAddress(userId: number, dto: CreateAddressDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['addresses'],
    });
    if (!user) throw new NotFoundException('User not found');

    const country = await this.countryRepository.findOne({
      where: { id: dto.country_id },
    });
    if (!country) throw new BadRequestException('Country not found');

    const address = this.addressRepository.create({
      unit_number: dto.unit_number,
      street_number: dto.street_number,
      address_line1: dto.address_line1,
      address_line2: dto.address_line2,
      city: dto.city,
      region: dto.region,
      postal_code: dto.postal_code,
      country,
    });

    await this.addressRepository.save(address);

    if (dto.is_default) {
      await this.userAddressRepository.update(
        { user: { id: userId } },
        { is_default: false },
      );
    }

    const userAddress = this.userAddressRepository.create({
      user,
      address,
      is_default: dto.is_default ?? false,
    });

    return this.userAddressRepository.save(userAddress);
  }
}
