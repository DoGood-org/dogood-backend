import {z} from "zod";

const organizationSignUpSchema = z.object({
    name: z
        .string({
            required_error: 'Name is required',
        })
        .min(4, { message: 'Name must be at least 4 characters' })
        .max(30, { message: 'Name must be less than 30 characters' }),

    email: z
        .string({
            required_error: 'Email is required',
        })
        .email({ message: 'Invalid email address' }),

    password: z
        .string({
            required_error: 'Password is required',
        })
        .min(6, { message: 'Password must be at least 6 characters' }),

    organizationName: z
        .string({
            required_error: 'Organization name is required',
        })
        .min(2, { message: 'Organization name must be at least 2 characters' })
        .max(50, { message: 'Organization name must be less than 50 characters' }),
});

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
        .number({ invalid_type_error: 'userId must be a number' })
        .int()
        .positive({ message: 'userId must be a positive integer' }),
    role: z.enum(['MODERATOR', 'MEMBER'])
});

 const addMemberToOrganizationSchema = z.object({
    userId: z
        .number({ invalid_type_error: 'userId must be a number' })
        .int()
        .positive({ message: 'userId must be a positive integer' }),
    organizationId: z.string({
        required_error: 'organizationId is required',
    }),
    role: z.enum(['MODERATOR', 'MEMBER']),
    status: z.enum(['PENDING','ACTIVE', 'INVITED', 'REMOVED']),
});

const createJoinRequestStatusSchema = z.object({
    senderId: z
        .number({ invalid_type_error: 'userId must be a number' })
        .int()
        .positive({ message: 'userId must be a positive integer' }),
    receiverOrganizationId: z
        .string({required_error: 'Organization name is required'}),
    receiverUserId: z.string(),
    direction: z.enum(['FROM_USER', 'FROM_ORGANIZATION']),
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
});

const updateJoinRequestStatusSchema = z.object({
  id: z.string({
    required_error: 'Join request id is required',
  }),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
});

export const Schemas = {
    organizationSignUpSchema,
    updateOrganizationSchema,
    userOrgUpdateRoleSchema,
    addMemberToOrganizationSchema,
    createJoinRequestStatusSchema,
    updateJoinRequestStatusSchema
};
