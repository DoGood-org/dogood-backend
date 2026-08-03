import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { HashService } from '@shared/services/hash.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { SiteRole, User } from '@prisma/client';

export type UserProfile = Pick<
  User,
  | 'id'
  | 'email'
  | 'name'
  | 'role'
  | 'status'
  | 'isEmailVerified'
  | 'createdAt'
  | 'updatedAt'
>;

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
  ) {}

  // leave create method for future use, currently not used in the project (maybe admin feature)
  async create(createUserDto: CreateUserDto): Promise<UserProfile> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashService.hashPassword(
      createUserDto.password,
    );

    const user = await this.prismaService.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        role: createUserDto.role || SiteRole.USER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async findById(id: string): Promise<UserProfile> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    return this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // leave update method for future use, currently not used in the project (maybe admin feature)
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserProfile> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const userWithEmail = await this.prismaService.user.findUnique({
        where: { email: updateUserDto.email },
        select: {
          id: true,
        },
      });

      if (userWithEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    const hashedPassword = updateUserDto.password
      ? await this.hashService.hashPassword(updateUserDto.password)
      : undefined;

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: {
        ...(updateUserDto.name !== undefined && { name: updateUserDto.name }),
        ...(updateUserDto.email !== undefined && {
          email: updateUserDto.email,
        }),
        ...(updateUserDto.role !== undefined && {
          role: updateUserDto.role,
        }),
        ...(hashedPassword !== undefined && { password: hashedPassword }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }
}
