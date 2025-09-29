import {
    JoinRequestStatus,
    JoinRequestDirection,
    OrganizationRole,
    MembershipStatus,
    Location
} from "@prisma/client";

export interface UpdateOrganization {
    name: string;
    location?: Location;
    phoneNumber?: string;
    email?: string;
    description: string;
    moreInfo?: string;
}

export interface CreateOrganization {
    userId: string,
    name: string,
    email?: string,
    password?: string
}

export interface AddMemberToOrganization {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  status: MembershipStatus;
}

export interface CreateJoinRequestInput {
  senderId: string;
  receiverOrganizationId: string;
  receiverUserId?: string;
  direction: JoinRequestDirection;
  status: JoinRequestStatus;
}
