import { Location, PrismaClient } from '@prisma/client';

export interface LocationSeedResult {
  kyiv: Location;
}

export async function seedLocations(
  prismaClient: PrismaClient,
): Promise<LocationSeedResult> {
  const kyiv = await prismaClient.location.upsert({
    where: { id: 'seed-location-kyiv' },
    update: {},
    create: {
      id: 'seed-location-kyiv',
      country: 'Ukraine',
      region: 'Kyiv Oblast',
      city: 'Kyiv',
      name: 'Kyiv city centre',
      coordinates: { lat: 50.4501, lng: 30.5234 },
    },
  });

  return { kyiv };
}
