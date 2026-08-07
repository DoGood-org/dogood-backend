import {
  Host,
  HostType,
  Location,
  MembershipStatus,
  Organization,
  OrganizationRole,
  PrismaClient,
  User,
} from '@prisma/client';

export interface OrganizationSeedDependencies {
  admin: User;
  location: Location;
}

export interface OrganizationSeedResult {
  organization: Organization;
  host: Host;
}

export async function seedOrganizations(
  prismaClient: PrismaClient,
  { admin, location }: OrganizationSeedDependencies,
): Promise<OrganizationSeedResult> {
  const organization = await prismaClient.organization.upsert({
    where: { name: 'DoGood Foundation' },
    update: {},
    create: {
      name: 'DoGood Foundation',
      email: 'contact@dogood.example',
      description: 'Seeded organization for local development',
      locationId: location.id,
      members: {
        create: {
          userId: admin.id,
          role: OrganizationRole.ADMIN,
          status: MembershipStatus.ACTIVE,
        },
      },
    },
  });

  const host = await prismaClient.host.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: { type: HostType.ORGANIZATION, organizationId: organization.id },
  });

  return { organization, host };
}
