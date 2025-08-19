import { Router } from 'express';
import { OrganizationController } from '../../controllers/organization.controller';

const router = Router();

router.post('/add-user', OrganizationController.addUserToOrganization);

export default router;
