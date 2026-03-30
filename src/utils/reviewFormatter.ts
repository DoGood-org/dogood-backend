import { Prisma } from "@prisma/client";

type ReviewWithAuthor = Prisma.ReviewGetPayload<{
  include: {
    authorUser: {
      select: {
        id: true;
        name: true;
        profile: {
          select: { avatar: true };
        };
      };
    };
    authorOrganization: {
      select: {
        id: true;
        name: true;
        avatar: true;
      };
    };
  };
}>;

export const formatReviewResponse = (reviews: ReviewWithAuthor[]) => {
  return reviews.map((r) => ({
    ...r,
    author: {
      id: r.authorUser?.id || r.authorOrganization?.id,
      name: r.authorUser?.name || r.authorOrganization?.name,
      avatar: r.authorUser?.profile?.avatar || r.authorOrganization?.avatar,
    },
    authorUser: undefined,
    authorOrganization: undefined,
  }));
};