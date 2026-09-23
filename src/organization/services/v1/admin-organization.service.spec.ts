import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';
import { AdminOrganizationServiceV1 } from 'src/organization/services/v1/admin-organization.service';

describe('AdminOrganizationServiceV1', () => {
  const prisma = {
    organization: { count: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new AdminOrganizationServiceV1(
    prisma as unknown as PrismaService,
    new OrganizationMapperV1(),
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organization.count.mockReturnValue('count-query');
    prisma.organization.findMany.mockReturnValue('find-query');
    prisma.$transaction.mockResolvedValue([0, []]);
  });

  it('should run count and page query in one transaction with the full select', async () => {
    await service.getOrganizationsForAdmin({
      page: '2',
      limit: '5',
      search: '  Help ',
    });

    const where = {
      deletedAt: null,
      name: { contains: 'Help', mode: Prisma.QueryMode.insensitive },
    };

    expect(prisma.$transaction).toHaveBeenCalledWith([
      'count-query',
      'find-query',
    ]);
    expect(prisma.organization.count).toHaveBeenCalledWith({ where });
    expect(prisma.organization.findMany).toHaveBeenCalledWith({
      where,
      skip: 5,
      take: 5,
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
    });
  });

  it.each([
    ['missing', undefined, undefined, undefined],
    ['garbage', 'abc', '', ['a', 'b']],
    ['zero', '0', '0', { name: 'x' }],
  ])(
    'should fall back to page 1, limit 10 and an empty search on %s query',
    async (_, page, limit, search) => {
      const response = await service.getOrganizationsForAdmin({
        page,
        limit,
        search,
      });

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: {
            deletedAt: null,
            name: { contains: '', mode: Prisma.QueryMode.insensitive },
          },
        }),
      );
      expect(response.pagination).toMatchObject({ page: 1, limit: 10 });
    },
  );

  it('should pass a negative page through to Prisma like legacy', async () => {
    await service.getOrganizationsForAdmin({
      page: '-1',
      limit: '10',
      search: undefined,
    });

    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: -20, take: 10 }),
    );
  });

  it('should propagate the Prisma error on an invalid skip', async () => {
    prisma.$transaction.mockRejectedValue(new Error('invalid skip'));

    await expect(
      service.getOrganizationsForAdmin({
        page: '-1',
        limit: '10',
        search: '',
      }),
    ).rejects.toThrow('invalid skip');
  });
});
