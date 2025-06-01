import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(4, "Name must be at least 6 characters").max(30, "Name must be more then 30 characters"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});