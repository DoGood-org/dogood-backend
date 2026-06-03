import type { Prisma, User as PrismaUser, UserProfile, UserSettings, UserStatus, BlockType, SiteRole } from '@prisma/client';
export { UserStatus, BlockType, SiteRole };

export interface CreateUser {
  name: string;
  email: string;
  password: string;
  emailVerificationCode: string;
  emailVerificationExpiresAt: Date;
  siteRole?: SiteRole;
  lang?: string;
}

export interface User {
  id: string; 
  email: string;
  name: string;
  password: string;
  siteRole: SiteRole; 
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  settings?: any;

  status: UserStatus;
  banType: BlockType | null;
  banReason: string | null;
  banExpiresAt: string | null; // Для інтерфейсів клієнта дати зазвичай приходять як string (ISO)
  bannedById: string | null;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  password?: string;
  siteRole?: SiteRole;
  avatar?: string;
  settings?: any;
  
  status?: UserStatus;
  banType?: BlockType | null;
  banReason?: string | null;
  banExpiresAt?: Date | null;
  bannedById?: string | null;
}


export interface UserWithStatus extends User {
  chatStatus: 'online' | 'offline' | 'away'; 
}

export interface updateRefreshToken {
  tokenId: string;
  newToken: string;
  newExpiresAt: Date;
  userId: string;
}

export type UserWithProfileAndSettings = PrismaUser & {
  userSettings: UserSettings | null;
  profile: UserProfile | null;
};

export type FullUser = Prisma.UserGetPayload<{
  include: {
    userSettings: true;
    profile: true;
    location: true;
    joinedTasks: true;
    reviewsWrittenUser: true;
    reviewsReceived: true;
    refreshTokens: true;
    organizations: {
      include: {
        organization: {
          select: { 
            id: true; 
            name: true; 
            avatar: true;       
            description: true;  
            createdAt: true; 
            _count: {           
              select: { members: true };
            };
          };
        };
      };
    };
  };
}> & {
  tasks: any[]; 
};

export type PublicUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    createdAt: true;
    profile: true;
    location: true;
    joinedTasks: true;
    reviewsReceived: {
      include: {
        authorUser: {
          select: { 
            name: true,
            profile: { select: { avatar: true } } 
          }
        }
      };
    };
    organizations: {
      include: {
        organization: {
          select: {
            id: true;
            name: true;
            avatar: true;
            description: true;
            _count: { select: { members: true } };
          };
        };
      };
    };
  };
}> & {
  tasks: any[]; 
};


export type AuthenticatedUser = {
  id: string;
  email: string;
  isEmailVerified: boolean;
  name: string;
  siteRole: SiteRole;
  status: UserStatus;
  banType?: BlockType | null;
  banReason?: string | null;
  banExpiresAt?: Date | null;
  bannedById?: string | null;
};