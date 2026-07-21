import { Router } from 'express';
import { organizationControllers } from '@/controllers/organization.controller';
import {authenticateUser, validateBody} from "@/middlewares";
import {Schemas} from "@/schemas/organization.schema";


export const organizationRoute = Router();

// Static routes (must be declared before parameterized routes)

organizationRoute.post('/create',
    authenticateUser,
    validateBody(Schemas.createOrganizationSchema),
    organizationControllers.registerOrganization
);

organizationRoute.get('/', organizationControllers.getOrganizationsByName);

organizationRoute.post(
    '/members',
    authenticateUser,
    validateBody(Schemas.addMemberToOrganizationSchema),
    
    organizationControllers.inviteMemberToOrganization
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


// Partially parameterized routes

organizationRoute.get(
    '/join-request/:id',
    authenticateUser,
    organizationControllers.getJoinRequestById 
);

organizationRoute.get(
    '/:organizationId/join-requests',
    authenticateUser, 
    organizationControllers.getJoinRequestsForOrganization);

organizationRoute.get(
    '/:organizationId/members',
    organizationControllers.getOrganizationMembers
);


// Generic parameterized routes (keep these last) 

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


