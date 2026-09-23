import { HttpStatus, Injectable } from '@nestjs/common';
import { MembershipStatus, OrganizationRole, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { LocationService } from 'src/location/services/location.service';
import {
  CreateOrganizationDataV1,
  OrganizationCreatedV1,
  OrganizationDetailsV1,
  OrganizationLocationDataV1,
  OrganizationMemberV1,
  OrganizationResponseV1,
  OrganizationSummaryV1,
  OrganizationUpdatedV1,
  UpdateOrganizationDataV1,
} from 'src/organization/interfaces/organization';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';

const ORGANIZATION_ALREADY_EXISTS_MESSAGE =
  'Organization with this name already exists';

@Injectable()
export class OrganizationServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly organizationMapper: OrganizationMapperV1,
  ) {}

  async createOrganization(
    data: CreateOrganizationDataV1,
    userId: string,
  ): Promise<OrganizationResponseV1<{ organization: OrganizationCreatedV1 }>> {
    const {
      name,
      avatar,
      description,
      phoneNumber,
      email,
      moreInfo,
      location,
    } = data;
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingOrganization) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        ORGANIZATION_ALREADY_EXISTS_MESSAGE,
        ErrorCode.ORGANIZATION_ALREADY_EXISTS,
      );
    }

    const locationId = await this.resolveLocationId(location);
    const organization = await this.prisma.organization.create({
      data: {
        name,
        avatarUrl: avatar,
        description,
        phoneNumber,
        email,
        additionalInfo: moreInfo,
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
        createdAt: true,
        phoneNumber: true,
        email: true,
        description: true,
        additionalInfo: true,
        avatarUrl: true,
        locationId: true,
        location: {
          select: { id: true, country: true, region: true, city: true },
        },
        members: {
          select: {
            id: true,
            userId: true,
            organizationId: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return this.organizationMapper.toOrganizationResponse(
      {
        organization:
          this.organizationMapper.toCreatedOrganization(organization),
      },
      SuccessCode.ORGANIZATION_CREATED,
      'Organization was created successfully',
    );
  }

  async getOrganizationsByName(
    name: unknown,
  ): Promise<OrganizationResponseV1<OrganizationSummaryV1[]>> {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Name query parameter is required and must be a non-empty string',
        ErrorCode.ORGANIZATION_NAME_QUERY_INVALID,
      );
    }

    const organizations = await this.prisma.organization.findMany({
      where: {
        name: { contains: name.trim(), mode: Prisma.QueryMode.insensitive },
        deletedAt: null,
      },
      take: 20,
      select: { id: true, name: true, avatarUrl: true },
    });

    return this.organizationMapper.toOrganizationResponse(
      organizations.map((organization) =>
        this.organizationMapper.toOrganizationSummary(organization),
      ),
      SuccessCode.ORGANIZATION_DATA_RETRIEVED,
      'Organizations found',
    );
  }

  async getOrganizationById(
    organizationId: string,
  ): Promise<OrganizationResponseV1<{ organization: OrganizationDetailsV1 }>> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
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
        location: {
          select: { id: true, country: true, region: true, city: true },
        },
        hostProfile: {
          select: {
            id: true,
            tasks: {
              where: { deletedAt: null },
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                status: true,
                hostId: true,
                startDate: true,
                endDate: true,
                categories: true,
                amount: true,
                currentAmount: true,
                currency: true,
                requirements: true,
                createdAt: true,
                updatedAt: true,
                taskLocation: { select: { name: true } },
                reviews: {
                  where: { deletedAt: null },
                  select: {
                    id: true,
                    rating: true,
                    comment: true,
                    authorType: true,
                    authorUserId: true,
                    authorOrganizationId: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    taskId: true,
                  },
                },
              },
            },
          },
        },
        members: {
          where: { status: MembershipStatus.ACTIVE, deletedAt: null },
          select: {
            id: true,
            role: true,
            status: true,
            userId: true,
            organizationId: true,
            user: {
              select: {
                id: true,
                name: true,
                userProfile: { select: { avatar: true } },
              },
            },
          },
        },
        reviewsReceived: {
          where: { deletedAt: null },
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            targetOrganizationId: true,
            authorUser: {
              select: {
                id: true,
                name: true,
                userProfile: { select: { avatar: true } },
              },
            },
            authorOrganization: {
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
              },
            },
          },
        },
        userReviewsWritten: {
          where: { deletedAt: null },
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            targetUserId: true,
            targetUser: {
              select: {
                id: true,
                name: true,
                userProfile: { select: { avatar: true } },
              },
            },
          },
        },
        orgReviewsWritten: {
          where: { deletedAt: null },
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            targetOrganizationId: true,
            targetOrganization: {
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
              },
            },
          },
        },
        taskReviewsWritten: {
          where: { deletedAt: null },
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            taskId: true,
            task: {
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                status: true,
                hostId: true,
                startDate: true,
                endDate: true,
                categories: true,
                amount: true,
                currentAmount: true,
                currency: true,
                requirements: true,
                createdAt: true,
                updatedAt: true,
                taskLocation: { select: { name: true } },
              },
            },
          },
        },
        systemReviewsWritten: {
          where: { deletedAt: null },
          select: {
            id: true,
            rating: true,
            comment: true,
            authorType: true,
            authorUserId: true,
            authorOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!organization) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Organization not found',
        ErrorCode.ORGANIZATION_NOT_FOUND,
      );
    }

    return this.organizationMapper.toOrganizationResponse(
      {
        organization:
          this.organizationMapper.toOrganizationDetails(organization),
      },
      SuccessCode.ORGANIZATION_DATA_RETRIEVED,
      'Organization found',
    );
  }

  async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationDataV1,
  ): Promise<OrganizationResponseV1<{ organization: OrganizationUpdatedV1 }>> {
    const {
      name,
      avatar,
      description,
      phoneNumber,
      email,
      moreInfo,
      location,
    } = data;
    const locationId = await this.resolveLocationId(location);

    try {
      const organization = await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          name,
          avatarUrl: avatar,
          description,
          phoneNumber,
          email,
          additionalInfo: moreInfo,
          locationId,
        },
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
          location: {
            select: { id: true, country: true, region: true, city: true },
          },
        },
      });

      return this.organizationMapper.toOrganizationResponse(
        {
          organization:
            this.organizationMapper.toUpdatedOrganization(organization),
        },
        SuccessCode.ORGANIZATION_UPDATED,
        'Organization was updated successfully',
      );
    } catch (error) {
      // NOTE: legacy let the duplicate name fall through as a 500; answering 409 is the human's decision (defect #10).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new V1ApiException(
          HttpStatus.CONFLICT,
          ORGANIZATION_ALREADY_EXISTS_MESSAGE,
          ErrorCode.ORGANIZATION_ALREADY_EXISTS,
        );
      }

      throw error;
    }
  }

  // NOTE: unlike legacy, the Location row is never deleted — it is a shared create-only reference now.
  async deleteOrganization(
    organizationId: string,
  ): Promise<OrganizationResponseV1<{ result: { message: string } }>> {
    const authoredReviewsWhere = { authorOrganizationId: organizationId };

    await this.prisma.$transaction([
      this.prisma.task.deleteMany({ where: { host: { organizationId } } }),
      this.prisma.host.deleteMany({ where: { organizationId } }),
      this.prisma.userOrganization.deleteMany({ where: { organizationId } }),
      this.prisma.userReview.deleteMany({ where: authoredReviewsWhere }),
      this.prisma.organizationReview.deleteMany({
        where: authoredReviewsWhere,
      }),
      this.prisma.taskReview.deleteMany({ where: authoredReviewsWhere }),
      this.prisma.systemReview.deleteMany({ where: authoredReviewsWhere }),
      this.prisma.organization.delete({
        where: { id: organizationId },
        select: { id: true },
      }),
    ]);

    return this.organizationMapper.toOrganizationResponse(
      {
        result: {
          message: 'Organization and related data deleted successfully',
        },
      },
      SuccessCode.ORGANIZATION_DELETED,
      'Organization and all related data were deleted',
    );
  }

  async getOrganizationMembers(
    organizationId: string,
  ): Promise<OrganizationResponseV1<{ members: OrganizationMemberV1[] }>> {
    const members = await this.prisma.userOrganization.findMany({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        organization: { deletedAt: null },
      },
      select: {
        id: true,
        role: true,
        status: true,
        userId: true,
        organizationId: true,
        user: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
      },
    });

    return this.organizationMapper.toOrganizationResponse(
      {
        members: members.map((member) =>
          this.organizationMapper.toOrganizationMember(member),
        ),
      },
      SuccessCode.ORGANIZATION_MEMBERS_RETRIEVED,
      "Member's list ready",
    );
  }

  private async resolveLocationId(
    location: OrganizationLocationDataV1 | undefined,
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
}
