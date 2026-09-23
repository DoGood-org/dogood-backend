import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import {
  AdminOrganizationsParamsV1,
  AdminOrganizationsResponseV1,
} from 'src/organization/interfaces/organization';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';

@Injectable()
export class AdminOrganizationServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationMapper: OrganizationMapperV1,
  ) {}

  // NOTE: page/skip are not validated, as in legacy: a negative page makes Prisma throw (500).
  async getOrganizationsForAdmin(
    params: AdminOrganizationsParamsV1,
  ): Promise<AdminOrganizationsResponseV1> {
    const { page: rawPage, limit: rawLimit, search: rawSearch } = params;
    const page = Number.parseInt(String(rawPage), 10) || 1;
    const limit = Number.parseInt(String(rawLimit), 10) || 10;
    let search = '';

    if (typeof rawSearch === 'string') {
      search = rawSearch.trim();
    }

    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      name: { contains: search, mode: Prisma.QueryMode.insensitive },
    };

    const [total, organizations] = await this.prisma.$transaction([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { createdAt: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.asc },
        ],
        select: {
          id: true,
          name: true,
          createdAt: true,
          phoneNumber: true,
          email: true,
          description: true,
          additionalInfo: true,
          avatarUrl: true,
          locationId: true,
          stripeCustomerId: true,
          location: {
            select: { id: true, country: true, region: true, city: true },
          },
          members: {
            where: { deletedAt: null, user: { deletedAt: null } },
            select: {
              id: true,
              userId: true,
              organizationId: true,
              role: true,
              status: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  status: true,
                  role: true,
                  userProfile: { select: { avatar: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return this.organizationMapper.toAdminOrganizationsResponse(
      organizations,
      total,
      page,
      limit,
    );
  }
}
