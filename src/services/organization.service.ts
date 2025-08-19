import { prisma } from '../lib/prisma';

export class OrganizationService {
  static async addUserToOrganization({
    userId,
    organizationId,
    role = 'MEMBER',
    status = 'ACTIVE',
  }: {
    userId: number;
    organizationId: string;
    role?: string;
    status?: string;
  }) {
    const existing = await prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (existing) {
      throw new Error('User is already a member of this organization');
    }
    return prisma.userOrganization.create({
      data: {
        userId,
        organizationId,
        role,
        status,
      },
    });
  }
}
