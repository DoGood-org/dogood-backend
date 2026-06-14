import { Router } from 'express';
import {authenticateUser} from "@/middlewares";
import { adminControllers } from '@/controllers/admin.controller';


export const adminRoute = Router();

adminRoute.get(
  '/organizations',
  authenticateUser,
  adminControllers.getAllOrganizations 
);