import { Location, PrismaClient } from '@prisma/client';

export interface LocationSeedResult {
  kyiv: Location;
}

export async function seedLocations(
  prismaClient: PrismaClient,
): Promise<LocationSeedResult> {
  const kyiv = await prismaClient.location.upsert({
    where: {
      country_region_city: {
        country: 'Ukraine',
        region: 'Kyiv Oblast',
        city: 'Kyiv',
      },
    },
    update: {},
    create: {
      id: 'seed-location-kyiv',
      country: 'Ukraine',
      region: 'Kyiv Oblast',
      city: 'Kyiv',
    },
  });

  return { kyiv };
}
