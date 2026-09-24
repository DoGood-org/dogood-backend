import { ReviewStatus } from '@prisma/client';
import { getAdminReviewsRequestSchemaV1 } from 'src/review/dtos/requests/v1/get-admin-reviews-request.dto';

describe('getAdminReviewsRequestSchemaV1', () => {
  it('should accept an empty query', () => {
    expect(getAdminReviewsRequestSchemaV1.parse({})).toEqual({});
  });

  it.each(['approved', 'APPROVED'])('should upper-case status %s', (status) => {
    expect(getAdminReviewsRequestSchemaV1.parse({ status })).toEqual({
      status: ReviewStatus.APPROVED,
    });
  });

  it.each([
    { status: 'Approved' },
    { type: 'USER' },
    { type: 'task' },
    { target_id: 'not-a-uuid' },
  ])('should reject %o like the legacy enum', (query) => {
    expect(getAdminReviewsRequestSchemaV1.safeParse(query).success).toBe(false);
  });
});
