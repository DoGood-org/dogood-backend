import {z} from "zod";

const organizationSignUpSchema = z.object({
    userId: z
        .number({ invalid_type_error: 'userId must be a number' })
        .int()
        .positive({ message: 'userId must be a positive integer' }),
    organizationName: z
        .string({
            required_error: 'Organization name is required',
        })
        .min(2, { message: 'Organization name must be at least 2 characters' })
        .max(50, { message: 'Organization name must be less than 50 characters' }),
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

export const addMemberToOrganizationSchema = z.object({
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
    organizationId: z
        .string({
            required_error: 'organizationId is required',
        }),
    status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
});

export const Schemas = {
    organizationSignUpSchema,
    userOrgUpdateRoleSchema,
    addMemberToOrganizationSchema,
    createJoinRequestStatusSchema,
    updateJoinRequestStatusSchema
};
