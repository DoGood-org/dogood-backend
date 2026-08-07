import { PrismaClient } from '@prisma/client';
import { seedBaseUsers } from './seed/base-user.seed';
import { seedLocations } from './seed/location.seed';
import { seedOrganizations } from './seed/organization.seed';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const { admin } = await seedBaseUsers(prisma);
  const { kyiv } = await seedLocations(prisma);

  await seedOrganizations(prisma, { admin, location: kyiv });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
