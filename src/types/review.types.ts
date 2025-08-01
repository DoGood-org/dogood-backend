export interface createReviewInput {
    authorId: number
    targetId: number
    rating: number
    comment?: string
}

export type UpdateReviewInput = Partial<Omit<createReviewInput, 'id'>>;
