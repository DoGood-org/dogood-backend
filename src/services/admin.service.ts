import { prisma } from "@/lib/prisma";

/**
 * Retrieves a paginated list of all organizations with their location and members for Admin Panel.
 *
 * @param {number} page - Current page number.
 * @param {number} limit - Items per page.
 * @returns {Promise<{ data: any[], pagination: any }>} Paginated list and metadata.
 */
const getAllOrganizationsForAdmin = async (
  page: number,
  limit: number,
  search?: string
) => {
  const skip = (page - 1) * limit;

  const searchFilter = search?.trim() ? { name: { contains: search.trim(), mode: 'insensitive' as const, }, } : {};

  const [total, data] = await prisma.$transaction([
    prisma.organization.count({
      where: searchFilter
    }),
    prisma.organization.findMany({
      where: searchFilter,
      skip,
      take: limit,
      include: {
        location: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                siteRole: true,
                profile: {
                  select: {
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const adminServices = {
  getAllOrganizationsForAdmin
}