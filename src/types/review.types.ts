export interface createReviewInput {
  authorId: number;
  targetId: number;
  rating: number;
  comment?: string;
}

export type UpdateReviewInput = Partial<Omit<createReviewInput, 'id'>>;

export interface getReviewsFilters {
  review_type?: 'USER' | 'ORGANIZATION' | 'PLATFORM';
  target_id?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
