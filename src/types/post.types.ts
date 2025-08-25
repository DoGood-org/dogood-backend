export interface createPostInput {
    title: string;
    category: string;
    content: string;
    image: string;
    tags: string[]
}

export type PostFilterInput = {
    category?: string;
    title?: string;
    fromDate?: string | Date;
    toDate?: string | Date;
};


export type UpdatePostInput = Partial<Omit<createPostInput, 'id'>>;
