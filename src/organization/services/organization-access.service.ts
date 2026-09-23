import { Injectable } from '@nestjs/common';
import { MembershipStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class OrganizationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async isOrganizationManager(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
        role: { in: [OrganizationRole.ADMIN, OrganizationRole.MODERATOR] },
        deletedAt: null,
        organization: { deletedAt: null },
      },
      select: { id: true },
    });

    return membership !== null;
  }

  async getOrganizationMemberRole(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationRole | null> {
    const membership = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        organization: { deletedAt: null },
      },
      select: { role: true },
    });

    return membership?.role ?? null;
  }

  async isOrganizationAdmin(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const role = await this.getOrganizationMemberRole(userId, organizationId);

    return role === OrganizationRole.ADMIN;
  }
}
