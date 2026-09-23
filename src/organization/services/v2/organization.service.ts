import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, OrganizationRole, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { LocationService } from 'src/location/services/location.service';
import {
  CreateOrganizationDataV2,
  OrganizationLocationDataV2,
  OrganizationMemberV2,
  OrganizationPageParamsV2,
  OrganizationSortFieldV2,
  OrganizationsParamsV2,
  OrganizationSummaryV2,
  OrganizationTaskV2,
  OrganizationV2,
  UpdateOrganizationDataV2,
} from 'src/organization/interfaces/organization';
import { OrganizationMapperV2 } from 'src/organization/mappers/v2/organization.mapper';

@Injectable()
export class OrganizationServiceV2 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly organizationMapper: OrganizationMapperV2,
  ) {}

  async getOrganizations(
    params: OrganizationsParamsV2,
  ): Promise<OrganizationSummaryV2[]> {
    const {
      search,
      sort = OrganizationSortFieldV2.NAME,
      sortDirection = Prisma.SortOrder.asc,
      skip = 0,
      limit = 20,
    } = params;

    return await this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        name: search
          ? { contains: search, mode: Prisma.QueryMode.insensitive }
          : undefined,
      },
      orderBy: [{ [sort]: sortDirection }, { id: Prisma.SortOrder.asc }],
      skip,
      take: limit,
      select: { id: true, name: true, avatarUrl: true },
    });
  }

  async createOrganization(
    data: CreateOrganizationDataV2,
    userId: string,
  ): Promise<OrganizationV2> {
    const { location, ...organization } = data;
    const locationId = await this.resolveLocationId(location);

    try {
      const row = await this.prisma.organization.create({
        data: {
          ...organization,
          locationId,
          members: {
            create: {
              userId,
              role: OrganizationRole.ADMIN,
              status: MembershipStatus.ACTIVE,
            },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          phoneNumber: true,
          email: true,
          additionalInfo: true,
          avatarUrl: true,
          createdAt: true,
          location: { select: { country: true, region: true, city: true } },
          hostProfile: { select: { id: true } },
        },
      });

      return this.organizationMapper.toOrganization(row);
    } catch (error) {
      this.rethrowOrganizationWriteError(error);
    }
  }

  async getOrganizationById(organizationId: string): Promise<OrganizationV2> {
    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        phoneNumber: true,
        email: true,
        additionalInfo: true,
        avatarUrl: true,
        createdAt: true,
        location: { select: { country: true, region: true, city: true } },
        hostProfile: { select: { id: true } },
      },
    });

    if (!row) {
      throw new NotFoundException('Organization not found');
    }

    return this.organizationMapper.toOrganization(row);
  }

  async getOrganizationMembers(
    organizationId: string,
    params: OrganizationPageParamsV2,
  ): Promise<OrganizationMemberV2[]> {
    const { skip = 0, limit = 20 } = params;
    const members = await this.prisma.userOrganization.findMany({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        organization: { deletedAt: null },
      },
      orderBy: [
        { createdAt: Prisma.SortOrder.asc },
        { id: Prisma.SortOrder.asc },
      ],
      skip,
      take: limit,
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
      },
    });

    return members.map((member) =>
      this.organizationMapper.toOrganizationMember(member),
    );
  }

  async getOrganizationTasks(
    organizationId: string,
    params: OrganizationPageParamsV2,
  ): Promise<OrganizationTaskV2[]> {
    const { skip = 0, limit = 20 } = params;

    return await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        host: { organizationId, organization: { deletedAt: null } },
      },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        status: true,
        categories: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });
  }

  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationDataV2,
  ): Promise<OrganizationV2> {
    const { location, ...organization } = data;
    const locationId = await this.resolveLocationId(location);

    try {
      const row = await this.prisma.organization.update({
        where: { id: organizationId, deletedAt: null },
        data: { ...organization, locationId },
        select: {
          id: true,
          name: true,
          description: true,
          phoneNumber: true,
          email: true,
          additionalInfo: true,
          avatarUrl: true,
          createdAt: true,
          location: { select: { country: true, region: true, city: true } },
          hostProfile: { select: { id: true } },
        },
      });

      return this.organizationMapper.toOrganization(row);
    } catch (error) {
      this.rethrowOrganizationWriteError(error);
    }
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    try {
      await this.prisma.organization.update({
        where: { id: organizationId, deletedAt: null },
        data: { deletedAt: new Date() },
        select: { id: true },
      });
    } catch (error) {
      this.rethrowOrganizationWriteError(error);
    }
  }

  private async resolveLocationId(
    location: OrganizationLocationDataV2 | undefined,
  ): Promise<string | undefined> {
    if (!location) {
      return undefined;
    }

    const { country = '', region = '', city = '' } = location;
    const locationId = await this.locationService.createLocation({
      country,
      region,
      city,
    });

    return locationId ?? undefined;
  }

  private rethrowOrganizationWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Organization with this name already exists',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Organization not found');
      }
    }

    throw error;
  }
}
