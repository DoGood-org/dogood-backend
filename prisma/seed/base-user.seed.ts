import { PrismaClient, SiteRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password123!';

const LOCALE_USERS = [
  { email: 'test-uk@example.com', name: 'Test Uk', language: 'uk' },
  { email: 'test-de@example.com', name: 'Test De', language: 'de' },
  { email: 'test-fr@example.com', name: 'Test Fr', language: 'en' },
];

export interface BaseUserSeedResult {
  admin: User;
  localeUsers: User[];
}

export async function seedBaseUsers(
  prismaClient: PrismaClient,
): Promise<BaseUserSeedResult> {
  const password = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const admin = await prismaClient.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password,
      role: SiteRole.ADMIN,
      isEmailVerified: true,
      userProfile: { create: { bio: 'Seeded administrator' } },
      userSettings: { create: {} },
    },
  });

  const localeUsers: User[] = [];

  for (const { email, name, language } of LOCALE_USERS) {
    const user = await prismaClient.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        password,
        userSettings: { create: { language } },
      },
    });

    localeUsers.push(user);
  }

  return { admin, localeUsers };
}
