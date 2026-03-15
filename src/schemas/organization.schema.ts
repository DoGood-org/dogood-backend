import { z } from "zod";

const locationSchema = z.object({
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters long')
    .max(100, 'Country must be at most 100 characters long'),
  region: z
    .string()
    .min(2, 'Region must be at least 2 characters long')
    .max(100, 'Region must be at most 100 characters long'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters long')
    .max(100, 'City must be at most 100 characters long'),
});

const createOrganizationSchema = z.object({
    avatar: z
        .string()
        .url('Avatar must be a valid URL')
        .optional(),
    organizationName: z
        .string({
            required_error: 'Organization name is required',
        })
        .min(2, { message: 'Organization name must be at least 2 characters' })
        .max(50, { message: 'Organization name must be less than 50 characters' }),
    description: z
        .string()
    .max(1000, { message: 'Description must be less than 1000 characters' }),
    location: locationSchema,
    phoneNumber: z
        .string()
        .min(5, { message: 'Phone number must be at least 5 characters' })
        .max(30, { message: 'Phone number must be less than 30 characters' }),
    email: z
        .string()
    .email({ message: 'Invalid email address' }),
});



const updateOrganizationSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters long')
    .max(100, 'Organization name must be at most 100 characters long')
    .optional(),

  location: locationSchema.optional(),

  phoneNumber: z
    .string()
    .min(5, 'Phone number must be at least 5 characters long')
    .max(30, 'Phone number must be at most 30 characters long')
    .optional(),

  email: z
    .string()
    .email('Invalid email address')
    .optional(),

  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters long')
    .optional(),

  moreInfo: z
    .string()
    .max(2000, 'More info must be at most 2000 characters long')
    .optional(),

  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional(),
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
    role: z.enum(['MODERATOR', 'MEMBER']),
    status: z.enum(['PENDING','ACTIVE', 'INVITED', 'REMOVED']),
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
