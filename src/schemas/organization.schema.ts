import { z } from "zod";

const locationSchema = z.object({
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters long')
    .max(100, 'Country must be at most 100 characters long')
    .optional(),
  region: z
    .string()
    .min(2, 'Region must be at least 2 characters long')
    .max(100, 'Region must be at most 100 characters long')
  .optional(),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters long')
    .max(100, 'City must be at most 100 characters long')
  .optional(),
});

const createOrganizationSchema = z.object({
  name: z
    .string({ required_error: 'Organization name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  phoneNumber: z
    .string()
    .min(5, 'Phone number must be at least 5 characters')
    .max(30, 'Phone number must be less than 30 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  moreInfo: z
    .string()
    .max(2000, 'More info must be at most 2000 characters long')
    .optional(),
  stripeCustomerId: z
    .string()
    .optional()
    .or(z.literal('')),
  location: locationSchema.optional(),
});

const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  phoneNumber: z
    .string()
    .min(5, 'Phone number must be at least 5 characters')
    .max(30, 'Phone number must be less than 30 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  moreInfo: z
    .string()
    .max(2000, 'More info must be at most 2000 characters long')
    .optional(),
  stripeCustomerId: z
    .string()
    .optional()
    .or(z.literal('')),
  location: locationSchema.optional(),
});


const userOrgUpdateRoleSchema = z.object({
    organizationId: z
        .string({
            required_error: 'organizationId is required',
        }),
    userId: z
        .string({
            required_error: 'userId is required',
        }),
    role: z.enum(['MODERATOR', 'MEMBER'])
});

 const addMemberToOrganizationSchema = z.object({
    userId: z
        .string({
            required_error: 'userId is required',
        }),
    organizationId: z.string({
    required_error: 'organizationId is required',
  }),
    role: z.enum(['MODERATOR', 'MEMBER']),
});

const createJoinRequestStatusSchema = z.object({
    receiverOrganizationId: z
        .string({ required_error: 'receiverOrganizationId is required' })
        .optional(), 
    receiverUserId: z
        .string()
        .optional(),
    direction: z.enum(['FROM_USER', 'FROM_ORGANIZATION']),
});

const updateJoinRequestStatusSchema = z.object({
  id: z.string({
    required_error: 'Join request id is required',
  }),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
});

export const Schemas = {
    createOrganizationSchema,
    updateOrganizationSchema,
    userOrgUpdateRoleSchema,
    addMemberToOrganizationSchema,
    createJoinRequestStatusSchema,
    updateJoinRequestStatusSchema
};
