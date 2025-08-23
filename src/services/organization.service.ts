import { prisma } from '../lib/prisma';

export class OrganizationService {
  static async createJoinRequest({
    senderId,
    receiverOrganizationId,
    receiverUserId,
    direction,
    status = 'PENDING',
  }: {
    senderId: number;
    receiverOrganizationId?: string;
    receiverUserId?: number;
    direction: 'FROM_USER' | 'FROM_ORGANIZATION';
    status?: string;
  }) {
    // Перевірка наявності аналогічного активного запиту
    const existing = await prisma.joinRequest.findFirst({
      where: {
        senderId,
        receiverOrganizationId,
        receiverUserId,
        direction,
        status: 'PENDING',
      },
    });
    if (existing) {
      throw new Error('Join request already exists');
    }
    return prisma.joinRequest.create({
      data: {
        senderId,
        receiverOrganizationId,
        receiverUserId,
        direction,
        status,
      },
    });
  }

  static async updateJoinRequestStatus({
    requestId,
    status,
  }: {
    requestId: string;
    status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  }) {
    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
    });
    if (!joinRequest) {
      throw new Error('Join request not found');
    }
    if (joinRequest.status !== 'PENDING') {
      throw new Error('Join request already processed');
    }
    return prisma.joinRequest.update({
      where: { id: requestId },
      data: { status },
    });
  }

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

  static async removeUserFromOrganization({
    userId,
    organizationId,
  }: {
    userId: number;
    organizationId: string;
  }) {
    const existing = await prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!existing) {
      throw new Error('User is not a member of this organization');
    }
    return prisma.userOrganization.delete({
      where: { userId_organizationId: { userId, organizationId } },
    });
  }
}
