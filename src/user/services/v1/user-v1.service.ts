import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { HashService } from '@shared/services/hash.service';
import { UpdateUserRequestV1Dto } from 'src/user/dto/v1/requests';
import { UserProfileV1 } from 'src/user/interfaces/v1/user-v1';

@Injectable()
export class UserV1Service {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
  ) {}

  async findById(id: string): Promise<UserProfileV1> {
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

  // leave update method for future use, currently not used in the project (maybe admin feature)
  async update(
    id: string,
    updateUserDto: UpdateUserRequestV1Dto,
  ): Promise<UserProfileV1> {
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
