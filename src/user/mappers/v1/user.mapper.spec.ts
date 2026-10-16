import {
  BlockType,
  CategoryType,
  Gender,
  MembershipStatus,
  OrganizationRole,
  ReviewAuthorType,
  ReviewStatus,
  SiteRole,
  TaskStatus,
  UserStatus,
} from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  FullUserRowV1,
  PublicUserRowV1,
  UserMembershipRowV1,
  UserReviewTargetTypeV1,
  UserTaskRowV1,
} from 'src/user/interfaces/user';
import { UserMapperV1 } from 'src/user/mappers/v1/user.mapper';

describe('UserMapperV1', () => {
  const mapper = new UserMapperV1();
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const updatedAt = new Date('2026-02-01T00:00:00Z');

  const taskRow = (
    id: string,
    override?: Partial<UserTaskRowV1>,
  ): UserTaskRowV1 => ({
    id,
    title: `Task ${id}`,
    description: 'Help',
    imageUrl: 'https://cdn/t.png',
    hostId: 'host-1',
    startDate: createdAt,
    endDate: null,
    status: TaskStatus.PENDING,
    categories: [CategoryType.NATURE],
    amount: null,
    currentAmount: null,
    currency: null,
    requirements: null,
    createdAt,
    updatedAt,
    taskLocation: null,
    ...override,
  });
  const review = {
    rating: 5,
    comment: 'Great',
    authorType: ReviewAuthorType.USER,
    authorUserId: 'user-1',
    authorOrganizationId: null,
    status: ReviewStatus.APPROVED,
    createdAt,
    updatedAt,
  };
  const membership: UserMembershipRowV1 = {
    role: OrganizationRole.ADMIN,
    status: MembershipStatus.ACTIVE,
    createdAt: updatedAt,
    organization: {
      id: 'org-1',
      name: 'Org',
      avatarUrl: 'https://cdn/o.png',
      description: 'We help',
      createdAt,
      _count: { members: 3 },
    },
  };
  const profileRow = {
    id: 'profile-1',
    userId: 'user-1',
    bio: 'Hi',
    avatar: 'https://cdn/a.png',
    gender: Gender.MALE,
    birthDate: createdAt,
    phoneNumber: '+380671234567',
  };
  const locationRow = {
    location: { id: 'loc-1', country: 'UA', region: 'Kyiv', city: 'Kyiv' },
  };
  const fullRow: FullUserRowV1 = {
    id: 'user-1',
    email: 'ann@b.co',
    name: 'Ann',
    role: SiteRole.USER,
    isEmailVerified: true,
    status: UserStatus.ACTIVE,
    stripeCustomerId: null,
    createdAt,
    updatedAt,
    ban: null,
    userSettings: {
      id: 'settings-1',
      userId: 'user-1',
      theme: 'dark',
      language: 'en',
    },
    userProfile: profileRow,
    userLocation: locationRow,
    taskParticipations: [],
    hostProfile: null,
    userReviewsWritten: [],
    orgReviewsWritten: [],
    taskReviewsWritten: [],
    systemReviewsWritten: [],
    reviewsReceived: [],
    organizations: [],
  };

  describe('toFullUser', () => {
    it('should rename role to siteRole and flatten the profile, settings and location', () => {
      const user = mapper.toFullUser(fullRow);

      expect(user).toMatchObject({
        id: 'user-1',
        email: 'ann@b.co',
        name: 'Ann',
        siteRole: SiteRole.USER,
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
        stripeCustomerId: null,
        userSettings: fullRow.userSettings,
        profile: profileRow,
        location: { id: 'loc-1', country: 'UA', region: 'Kyiv', city: 'Kyiv' },
      });
      expect(user).not.toHaveProperty('role');
      expect(user).not.toHaveProperty('userProfile');
    });

    it('should expose the ban as the legacy flat columns', () => {
      const banExpiresAt = new Date('2026-12-01T00:00:00Z');

      expect(
        mapper.toFullUser({
          ...fullRow,
          status: UserStatus.BANNED,
          ban: {
            banType: BlockType.ONE_MONTH,
            banReason: 'Spam',
            banExpiresAt,
            bannedById: 'admin-1',
          },
        }),
      ).toMatchObject({
        banType: BlockType.ONE_MONTH,
        banReason: 'Spam',
        banExpiresAt,
        bannedById: 'admin-1',
      });
    });

    it('should answer null ban columns, profile, settings and location when absent', () => {
      expect(
        mapper.toFullUser({
          ...fullRow,
          userSettings: null,
          userProfile: null,
          userLocation: null,
        }),
      ).toMatchObject({
        banType: null,
        banReason: null,
        banExpiresAt: null,
        bannedById: null,
        userSettings: null,
        profile: null,
        location: null,
      });
    });

    it('should map tasks to the legacy shape (picture, lat/lng location, locationName)', () => {
      const [task] = mapper.toFullUser({
        ...fullRow,
        taskParticipations: [
          {
            task: taskRow('t-1', {
              taskLocation: { name: 'Park', latitude: 50.4, longitude: 30.5 },
            }),
          },
        ],
      }).joinedTasks;

      expect(task).toEqual({
        id: 't-1',
        title: 'Task t-1',
        description: 'Help',
        picture: 'https://cdn/t.png',
        hostId: 'host-1',
        startDate: createdAt,
        endDate: null,
        location: { lat: 50.4, lng: 30.5 },
        locationName: 'Park',
        amount: null,
        currentAmount: null,
        currency: null,
        requirements: null,
        status: TaskStatus.PENDING,
        categories: [CategoryType.NATURE],
        createdAt,
        updatedAt,
      });
    });

    it('should answer location null when either coordinate is missing', () => {
      const [task] = mapper.toFullUser({
        ...fullRow,
        taskParticipations: [
          {
            task: taskRow('t-1', {
              taskLocation: { name: 'Park', latitude: 50.4, longitude: null },
            }),
          },
        ],
      }).joinedTasks;

      expect(task.location).toBeNull();
      expect(task.locationName).toBe('Park');
    });

    it('should merge hosted tasks first and add joined ones not already there', () => {
      const user = mapper.toFullUser({
        ...fullRow,
        hostProfile: { tasks: [taskRow('t-1'), taskRow('t-2')] },
        taskParticipations: [
          { task: taskRow('t-2') },
          { task: taskRow('t-3') },
        ],
      });

      expect(user.tasks.map(({ id }) => id)).toEqual(['t-1', 't-2', 't-3']);
      expect(user.joinedTasks.map(({ id }) => id)).toEqual(['t-2', 't-3']);
    });

    it('should rebuild the legacy Review rows from the four written-review tables', () => {
      const user = mapper.toFullUser({
        ...fullRow,
        userReviewsWritten: [{ ...review, id: 'r-1', targetUserId: 'user-2' }],
        orgReviewsWritten: [
          { ...review, id: 'r-2', targetOrganizationId: 'org-1' },
        ],
        taskReviewsWritten: [{ ...review, id: 'r-3', taskId: 't-1' }],
        systemReviewsWritten: [{ ...review, id: 'r-4' }],
      });

      expect(
        user.reviewsWrittenUser.map(
          ({ id, targetType, targetUserId, targetOrganizationId, taskId }) => ({
            id,
            targetType,
            targetUserId,
            targetOrganizationId,
            taskId,
          }),
        ),
      ).toEqual([
        {
          id: 'r-1',
          targetType: UserReviewTargetTypeV1.USER,
          targetUserId: 'user-2',
          targetOrganizationId: null,
          taskId: null,
        },
        {
          id: 'r-2',
          targetType: UserReviewTargetTypeV1.ORGANIZATION,
          targetUserId: null,
          targetOrganizationId: 'org-1',
          taskId: null,
        },
        {
          id: 'r-3',
          targetType: UserReviewTargetTypeV1.TASK,
          targetUserId: null,
          targetOrganizationId: null,
          taskId: 't-1',
        },
        {
          id: 'r-4',
          targetType: UserReviewTargetTypeV1.PLATFORM,
          targetUserId: null,
          targetOrganizationId: null,
          taskId: null,
        },
      ]);
    });

    it('should keep every legacy Review key, with platformId always null', () => {
      const [received] = mapper.toFullUser({
        ...fullRow,
        reviewsReceived: [{ ...review, id: 'r-1', targetUserId: 'user-1' }],
      }).reviewsReceived;

      expect(received).toEqual({
        id: 'r-1',
        rating: 5,
        comment: 'Great',
        authorType: ReviewAuthorType.USER,
        authorUserId: 'user-1',
        authorOrganizationId: null,
        targetType: UserReviewTargetTypeV1.USER,
        targetUserId: 'user-1',
        targetOrganizationId: null,
        platformId: null,
        taskId: null,
        status: ReviewStatus.APPROVED,
        createdAt,
        updatedAt,
      });
    });

    it('should flatten memberships the mapUserOrganizations way (_count kept, joinedAt = membership date)', () => {
      const [organization] = mapper.toFullUser({
        ...fullRow,
        organizations: [membership],
      }).organizations;

      expect(organization).toEqual({
        id: 'org-1',
        name: 'Org',
        avatar: 'https://cdn/o.png',
        description: 'We help',
        createdAt,
        _count: { members: 3 },
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        joinedAt: updatedAt,
      });
    });
  });

  describe('toPublicUser', () => {
    const publicRow: PublicUserRowV1 = {
      id: 'user-1',
      name: 'Ann',
      createdAt,
      userProfile: profileRow,
      userLocation: null,
      taskParticipations: [{ task: taskRow('t-2') }],
      hostProfile: { tasks: [taskRow('t-1')] },
      reviewsReceived: [
        {
          ...review,
          id: 'r-1',
          targetUserId: 'user-1',
          authorUser: { name: 'Bob', userProfile: { avatar: null } },
        },
      ],
      organizations: [membership],
    };

    it('should expose only the public keys, never email or settings', () => {
      const user = mapper.toPublicUser(publicRow);

      expect(Object.keys(user)).toEqual([
        'id',
        'name',
        'createdAt',
        'profile',
        'location',
        'joinedTasks',
        'reviewsReceived',
        'organizations',
        'tasks',
      ]);
      expect(user.tasks.map(({ id }) => id)).toEqual(['t-1', 't-2']);
    });

    it('should attach the review author as name + profile.avatar', () => {
      const [received] = mapper.toPublicUser(publicRow).reviewsReceived;

      expect(received.authorUser).toEqual({
        name: 'Bob',
        profile: { avatar: null },
      });
      expect(received.targetType).toBe(UserReviewTargetTypeV1.USER);
    });

    it('should keep authorUser null for a review whose author is gone', () => {
      const [received] = mapper.toPublicUser({
        ...publicRow,
        reviewsReceived: [
          { ...review, id: 'r-1', targetUserId: 'user-1', authorUser: null },
        ],
      }).reviewsReceived;

      expect(received.authorUser).toBeNull();
    });

    it('should map memberships the sanitizeUser way (membersCount, no createdAt)', () => {
      const [organization] = mapper.toPublicUser(publicRow).organizations;

      expect(organization).toEqual({
        id: 'org-1',
        name: 'Org',
        avatar: 'https://cdn/o.png',
        description: 'We help',
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        joinedAt: updatedAt,
        membersCount: 3,
      });
    });
  });

  describe('toUserName', () => {
    it('should flatten the avatar', () => {
      expect(
        mapper.toUserName({
          id: 'user-1',
          name: 'Ann',
          userProfile: { avatar: 'https://cdn/a.png' },
        }),
      ).toEqual({ id: 'user-1', name: 'Ann', avatar: 'https://cdn/a.png' });
    });

    it.each([null, { avatar: null }, { avatar: '' }])(
      'should answer avatar null for profile %p',
      (userProfile) => {
        expect(
          mapper.toUserName({ id: 'user-1', name: 'Ann', userProfile }).avatar,
        ).toBeNull();
      },
    );
  });

  describe('envelopes', () => {
    it('should build the data envelope', () => {
      expect(
        mapper.toUserResponse({ a: 1 }, SuccessCode.USER_PROFILE_RETRIEVED),
      ).toEqual({
        status: 'success',
        code: SuccessCode.USER_PROFILE_RETRIEVED,
        data: { a: 1 },
      });
    });

    it('should put message between code and data', () => {
      expect(
        Object.keys(
          mapper.toUserMessageResponse(
            { users: [] },
            SuccessCode.USER_DATA_RETRIEVED,
            'msg',
          ),
        ),
      ).toEqual(['status', 'code', 'message', 'data']);
    });

    it('should build the delete envelope without data', () => {
      expect(mapper.toUserDeletedResponse()).toEqual({
        status: 'success',
        code: SuccessCode.USER_DELETED,
      });
    });
  });
});
