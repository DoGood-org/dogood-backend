import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import logger from '@/utils/logger';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export const createUserService = async (data: CreateUserInput) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      siteRole: 'USER',
    },
  });

  logger.info('✅ User created in service', { userId: newUser.id, email: newUser.email });

  return newUser;
};

export const findUserByEmailService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  return user;
};

export const comparePasswords = async (plainPassword: string, hashedPassword: string) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};