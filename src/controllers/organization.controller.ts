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
  static async removeUserFromOrganization(req: Request, res: Response) {
    try {
      const { userId, organizationId } = req.body;
      const result = await OrganizationService.removeUserFromOrganization({
        userId,
        organizationId,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
  static async createJoinRequest(req: Request, res: Response) {
    try {
      const {
        senderId,
        receiverOrganizationId,
        receiverUserId,
        direction,
        status,
      } = req.body;
      const joinRequest = await OrganizationService.createJoinRequest({
        senderId,
        receiverOrganizationId,
        receiverUserId,
        direction,
        status,
      });
      res.status(201).json(joinRequest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
  static async updateJoinRequestStatus(req: Request, res: Response) {
    try {
      const { requestId, status } = req.body;
      const result = await OrganizationService.updateJoinRequestStatus({
        requestId,
        status,
      });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
