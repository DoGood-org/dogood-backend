import {
    JoinRequestStatus,
    JoinRequestDirection,
    OrganizationRole,
    MembershipStatus,
    Location,
    PaymentOption,
    UserProfile,
    Host,
    Task,
    Review,
    User,
} from "@prisma/client";


export interface OrganizationLocation {
  country: string;
  region: string;
  city: string;
}

export interface UpdateOrganization {
  organizationName?: string;      
  location?: OrganizationLocation;
  phoneNumber?: string;
  email?: string;
  description?: string;           
  moreInfo?: string;
  avatar?: string;
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

export interface UpdateRoleMemberInput {
  organizationId: string,
  targetUserId: string,
  newRole: 'MODERATOR' | 'MEMBER'
}

export interface FullOrganization {
  id: string;
  name: string;
  createdAt: Date;
  phoneNumber?: string | null;
  email?: string | null;
  description?: string | null;
  moreInfo?: string | null;
  avatar?: string | null;
  location?: Location | null;
  paymentOption?: PaymentOption | null;
  hostProfile?: Host | null;
  members: Array<{
    userId: string;
    role: OrganizationRole;
    status: MembershipStatus;
    user: User & { profile?: UserProfile | null };
  }>;
  tasks: Array<Task & { locationName?: Location | null; reviews: Review[] }>;
  reviews: Review[];
  reviewsWrittenOrg: Review[];
}