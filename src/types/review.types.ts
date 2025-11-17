export type createReviewInput = {
  authorType: 'USER' | 'ORGANIZATION' | 'HOST';
  authorUserId?: string;
  authorOrganizationId?: string;
  targetType: 'USER' | 'ORGANIZATION' | 'PLATFORM';
  targetUserId?: string;
  targetOrganizationId?: string;
  targetPlatformId?: string;
  rating: number;
  comment?: string;
};

export type UpdateReviewInput = Partial<{
  authorType: 'USER' | 'ORGANIZATION';
  authorUserId?: string;
  authorOrganizationId?: string;
  targetType: 'USER' | 'ORGANIZATION' | 'PLATFORM';
  targetUserId?: string;
  targetOrganizationId?: string;
  targetPlatformId?: string;
  rating?: number;
  comment?: string;
}>;

export interface getReviewsFilters {
  review_type?: 'USER' | 'ORGANIZATION' | 'PLATFORM';
  target_id?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
