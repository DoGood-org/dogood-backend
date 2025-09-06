import { Router } from 'express';
import { organizationControllers } from '@/controllers/organization.controller';
import {validateBody} from "@/middlewares";
import {Schemas} from "@/schemas/auth.schema";
import {controllers} from "@/controllers/auth.controller";
import {authRoute} from "@routes/api/auth.route";


export const organizationRoute = Router();


authRoute.post(
    '/signup',
    validateBody(Schemas.companySignUpSchema),
    controllers.registerOrganization
);

authRoute.get(
    '/:organizationId/members',
    controllers.getOrganizationMembersController
);

authRoute.post(
    '/members',
    controllers.addMemberToOrganizationController
);

authRoute.delete(
    '/members',
    controllers.removeMemberFromOrganizationController
);

organizationRoute.post(
    '/join-request',
    organizationControllers.createJoinRequest);

organizationRoute.patch(
    '/join-request/status',
    organizationControllers.updateJoinRequestStatus
);




