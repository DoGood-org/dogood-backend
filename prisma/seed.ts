import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  await prisma.user.upsert({
    where: { email: 'testuser@example.com' },
    update: { 
      isEmailVerified: true,
      status: 'ACTIVE'
    },
    create: {
      email: 'testuser@example.com',
      name: 'Test User',
      password: hashedPassword,
      isEmailVerified: true,
      status: 'ACTIVE'
    },
  });

  console.log('Test user created/updated successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });