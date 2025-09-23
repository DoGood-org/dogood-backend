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
    userId: number,
    name: string,
    email?: string,
    password?: string
}

export interface AddMemberToOrganization {
    userId: number,
    organizationId: string,
    role: OrganizationRole,
    status: MembershipStatus,
}

export interface CreateJoinRequestInput {
    senderId: number,
    receiverOrganizationId: string,
    receiverUserId?: number,
    direction: JoinRequestDirection,
    status: JoinRequestStatus,
}
