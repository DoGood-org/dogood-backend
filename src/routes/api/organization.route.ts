import { Router } from 'express';
import { organizationControllers } from '@/controllers/organization.controller';
import {authenticateUser, validateBody} from "@/middlewares";
import {Schemas} from "@/schemas/organization.schema";


export const organizationRoute = Router();

organizationRoute.post('/create',
  authenticateUser,
  validateBody(Schemas.createOrganizationSchema),
  organizationControllers.registerOrganization
);

organizationRoute.get('/', organizationControllers.getOrganizationsByName);

organizationRoute.get('/:id', organizationControllers.getOrganizationById);

organizationRoute.patch(
    '/:id',
    authenticateUser,
    validateBody(Schemas.updateOrganizationSchema),
    organizationControllers.updateOrganization
)

organizationRoute.delete(
    '/:id',
    authenticateUser,
    organizationControllers.deleteOrganization
)


organizationRoute.get(
    '/:organizationId/members',
    organizationControllers.getOrganizationMembers
);

organizationRoute.post(
    '/members',
    authenticateUser,
    validateBody(Schemas.addMemberToOrganizationSchema),
    organizationControllers.addMemberToOrganization
);

organizationRoute.delete(
    '/members',
    authenticateUser,
    organizationControllers.removeMemberFromOrganization
);

organizationRoute.patch(
    '/members/role',
    authenticateUser,
    organizationControllers.updateMemberRole
);

organizationRoute.post(
    '/join-request',
    authenticateUser,
    validateBody(Schemas.createJoinRequestStatusSchema),
    organizationControllers.createJoinRequest);

organizationRoute.patch(
    '/join-request/status',
    authenticateUser,
    validateBody(Schemas.updateJoinRequestStatusSchema),
    organizationControllers.updateJoinRequestStatus
);




