import { Request, Response } from 'express';
import { OrganizationService } from '../services/organization.service';

export class OrganizationController {
  static async addUserToOrganization(req: Request, res: Response) {
    try {
      const { userId, organizationId, role, status } = req.body;
      const membership = await OrganizationService.addUserToOrganization({
        userId,
        organizationId,
        role,
        status,
      });
      res.status(201).json(membership);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
