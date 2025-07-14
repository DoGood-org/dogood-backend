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
// ! FIXME:  може бути юзер або компанія
  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      siteRole: 'USER',
    },
  });

  logger.info('✅ User created in service', {
    userId: newUser.id,
    email: newUser.email,
  });

  return newUser;
};

export const findUserByEmailService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  return user;
};

export const findUserByIdService = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  return user;
};

// ! add: доадати сервіс по отриманню юзера по коду верифікації verifyEmailService(verificationCode);