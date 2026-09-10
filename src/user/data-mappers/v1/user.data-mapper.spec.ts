import {
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
import { UserDataMapperV1 } from 'src/user/data-mappers/v1/user.data-mapper';
import {
  FullUserRowV1,
  PublicUserReviewReceivedRowV1,
  PublicUserRowV1,
  UserTaskV1,
} from 'src/user/interfaces/v1/user';

const now = new Date('2026-08-01T00:00:00.000Z');

const buildTask = (id: string): UserTaskV1 => ({
  id,
  title: `task ${id}`,
  description: 'description',
  imageUrl: null,
  hostId: 'host-id',
  startDate: now,
  endDate: null,
  locationId: null,
  amount: null,
  currentAmount: null,
  currency: null,
  requirements: null,
  status: TaskStatus.CREATED,
  categories: [CategoryType.NATURE],
  createdAt: now,
  updatedAt: now,
});

const buildReview = (): Omit<PublicUserReviewReceivedRowV1, 'authorUser'> => ({
  id: 'review-id',
  rating: 5,
  comment: 'comment',
  authorType: ReviewAuthorType.USER,
  authorUserId: 'author-id',
  authorOrganizationId: null,
  targetUserId: 'user-id',
  status: ReviewStatus.PENDING,
  createdAt: now,
  updatedAt: now,
});

const organization = {
  id: 'org-id',
  name: 'Org',
  avatarUrl: 'https://example.com/org.png',
  description: 'org description',
  _count: { members: 7 },
};

const organizationCreatedAt = new Date('2026-07-01T00:00:00.000Z');

const fullMembership = {
  role: OrganizationRole.MEMBER,
  status: MembershipStatus.ACTIVE,
  createdAt: now,
  organization: { ...organization, createdAt: organizationCreatedAt },
};

const publicMembership = {
  role: OrganizationRole.MEMBER,
  status: MembershipStatus.ACTIVE,
  createdAt: now,
  organization,
};

const fullUserRow: FullUserRowV1 = {
  id: 'user-id',
  email: 'user@example.com',
  name: 'User',
  role: SiteRole.USER,
  isEmailVerified: true,
  status: UserStatus.ACTIVE,
  locationId: 'location-id',
  stripeCustomerId: null,
  createdAt: now,
  updatedAt: now,
  userSettings: {
    id: 'settings-id',
    userId: 'user-id',
    theme: 'dark',
    language: 'en',
  },
  userProfile: {
    id: 'profile-id',
    userId: 'user-id',
    bio: 'bio',
    avatar: null,
    gender: Gender.OTHER,
    birthDate: null,
    phoneNumber: '+380000000000',
  },
  location: {
    id: 'location-id',
    country: 'Ukraine',
    region: 'Kyiv',
    city: 'Kyiv',
  },
  userReviewsWritten: [],
  reviewsReceived: [],
  organizations: [fullMembership],
  hostProfile: { tasks: [buildTask('task-1'), buildTask('task-2')] },
  taskParticipations: [
    { task: buildTask('task-2') },
    { task: buildTask('task-3') },
  ],
};

const publicUserRow: PublicUserRowV1 = {
  id: 'user-id',
  name: 'User',
  createdAt: now,
  userProfile: fullUserRow.userProfile,
  location: fullUserRow.location,
  reviewsReceived: [],
  organizations: [publicMembership],
  hostProfile: null,
  taskParticipations: [],
};

describe('UserDataMapperV1', () => {
  const mapper = new UserDataMapperV1();

  it('should spread the organization row into the full profile, keeping _count', () => {
    const [membership] = mapper.toUserProfile(fullUserRow).organizations;

    expect(membership).toEqual({
      id: 'org-id',
      name: 'Org',
      avatar: 'https://example.com/org.png',
      description: 'org description',
      createdAt: organizationCreatedAt,
      _count: { members: 7 },
      role: OrganizationRole.MEMBER,
      status: MembershipStatus.ACTIVE,
      joinedAt: now,
    });
  });

  it('should remap the organization into membersCount on the public profile', () => {
    const [membership] =
      mapper.toPublicUserProfile(publicUserRow).organizations;

    expect(membership).toEqual({
      id: 'org-id',
      name: 'Org',
      avatar: 'https://example.com/org.png',
      description: 'org description',
      role: OrganizationRole.MEMBER,
      status: MembershipStatus.ACTIVE,
      joinedAt: now,
      membersCount: 7,
    });
  });

  /**
   * NOTE: the two shapes differed in legacy and the difference is deliberate — ADR-0007.
   * `findFullUserById` ran `mapUserOrganizations` before `sanitizeUser`, which then bailed out
   * on the missing `entry.organization`; the public profile never ran the first mapper.
   */
  it('should keep the full and public organization shapes different', () => {
    const [fullOrganization] = mapper.toUserProfile(fullUserRow).organizations;
    const [publicOrganization] =
      mapper.toPublicUserProfile(publicUserRow).organizations;

    expect(fullOrganization).toHaveProperty('_count');
    expect(fullOrganization).not.toHaveProperty('membersCount');
    expect(publicOrganization).toHaveProperty('membersCount');
    expect(publicOrganization).not.toHaveProperty('_count');
    expect(publicOrganization).not.toHaveProperty('createdAt');
  });

  it('should rename the profile and written reviews onto their legacy keys', () => {
    const profile = mapper.toUserProfile(fullUserRow);

    expect(profile.profile).toBe(fullUserRow.userProfile);
    expect(profile.reviewsWrittenUser).toBe(fullUserRow.userReviewsWritten);
    expect(profile).not.toHaveProperty('userProfile');
    expect(profile).not.toHaveProperty('userReviewsWritten');
    expect(mapper.toPublicUserProfile(publicUserRow)).not.toHaveProperty(
      'userProfile',
    );
  });

  it('should name the review author profile by its legacy key', () => {
    const [review] = mapper.toPublicUserProfile({
      ...publicUserRow,
      reviewsReceived: [
        {
          ...buildReview(),
          authorUser: { name: 'Author', userProfile: { avatar: 'a.png' } },
        },
      ],
    }).reviewsReceived;

    expect(review.authorUser).toEqual({
      name: 'Author',
      profile: { avatar: 'a.png' },
    });
  });

  it('should keep a review whose author was removed', () => {
    const [review] = mapper.toPublicUserProfile({
      ...publicUserRow,
      reviewsReceived: [{ ...buildReview(), authorUser: null }],
    }).reviewsReceived;

    expect(review.authorUser).toBeNull();
  });

  it('should merge hosted and joined tasks without duplicating ids', () => {
    const { tasks } = mapper.toUserProfile(fullUserRow);

    expect(tasks.map((task) => task.id)).toEqual([
      'task-1',
      'task-2',
      'task-3',
    ]);
  });

  it('should drop the raw relation keys the merged tasks replace', () => {
    const profile = mapper.toUserProfile(fullUserRow);

    expect(profile).not.toHaveProperty('hostProfile');
    expect(profile).not.toHaveProperty('taskParticipations');
  });

  it('should never expose private user fields', () => {
    const profile = mapper.toUserProfile(fullUserRow);

    for (const field of [
      'password',
      'emailVerificationCode',
      'emailVerificationExpiresAt',
      'resetPasswordToken',
      'resetPasswordExpiresAt',
      'refreshTokens',
    ]) {
      expect(profile).not.toHaveProperty(field);
    }
  });

  it('should flatten a search row to id, name and avatar only', () => {
    const results = mapper.toUserSearchResults([
      { id: 'a', name: 'Ivan', userProfile: { avatar: 'https://a/1.png' } },
      { id: 'b', name: 'Ivanna', userProfile: null },
    ]);

    expect(results).toEqual([
      { id: 'a', name: 'Ivan', avatar: 'https://a/1.png' },
      { id: 'b', name: 'Ivanna', avatar: null },
    ]);
  });

  it('should return an empty task list when the user hosts nothing', () => {
    const profile = mapper.toPublicUserProfile(publicUserRow);

    expect(profile.tasks).toEqual([]);
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('userSettings');
    expect(profile).not.toHaveProperty('stripeCustomerId');
  });
});
