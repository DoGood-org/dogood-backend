import { Router } from 'express';
import { organizationControllers } from '@/controllers/organization.controller';
import {authenticateUser, validateBody} from "@/middlewares";
import {Schemas} from "@/schemas/organization.schema";


export const organizationRoute = Router();

organizationRoute.post(
    '/signup',
    validateBody(Schemas.organizationSignUpSchema),
    organizationControllers.registerOrganization
);

organizationRoute.get(
    '/:organizationId/members',
    organizationControllers.getOrganizationMembers
);

organizationRoute.post(
    '/members',
    validateBody(Schemas.addMemberToOrganizationSchema),
    organizationControllers.addMemberToOrganization
);

organizationRoute.delete(
    '/members',
    organizationControllers.removeMemberFromOrganization
);

organizationRoute.post(
    '/join-request',
    validateBody(Schemas.createJoinRequestStatusSchema),
    organizationControllers.createJoinRequest);

organizationRoute.patch(
    '/join-request/status',
    validateBody(Schemas.updateJoinRequestStatusSchema),
    organizationControllers.updateJoinRequestStatus
);


organizationRoute.patch(
    '/:id',
    authenticateUser,
    organizationControllers.updateOrganization
)


organizationRoute.delete(
    '/:id',
    authenticateUser,
    organizationControllers.deleteOrganization
)
