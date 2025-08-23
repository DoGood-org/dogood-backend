import { Router } from 'express';
import { OrganizationController } from '../../controllers/organization.controller';

const router = Router();

router.post('/add-user', OrganizationController.addUserToOrganization);

router.delete(
  '/remove-user',
  OrganizationController.removeUserFromOrganization
);

router.post('/join-request', OrganizationController.createJoinRequest);
router.patch(
  '/join-request/status',
  OrganizationController.updateJoinRequestStatus
);

export default router;
