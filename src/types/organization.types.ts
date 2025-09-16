import {
    OrganizationStatus,
    JoinRequestDirection,
    OrganizationRole,
    Status
} from "@prisma/client";

export interface UpdateOrganization {
    organizationName: string;
    location?: string;
    phoneNumber?: string;
    email?: string;
    description: string;
    moreInfo?: string;
}


export interface CreateOrganization {
    userId: number,
    name?: string,
    email?: string,
    password?: string,
    organizationName: string,
}

export interface AddMemberToOrganization {
    userId: number,
    organizationId: string,
    role: OrganizationRole,
    status: Status,
}

export interface CreateJoinRequestInput {
    senderId: number,
    receiverOrganizationId: string,
    receiverUserId?: number,
    direction: JoinRequestDirection,
    status: OrganizationStatus,
}
