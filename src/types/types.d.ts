import { User } from "@prisma/client";
import "express";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
    }
  }

   namespace Express {
    interface Request {
      user?: User;
    }
  }
}
