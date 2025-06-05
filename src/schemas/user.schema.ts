import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string().min(2).max(50).optional(),
    avatar: z.string().url().optional(),
    bio: z.string().max(300).optional(),
    location: z.string().max(100).optional(),
});
