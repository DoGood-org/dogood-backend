import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { JWT_SECRET } from "@/config/env";


const prisma = new PrismaClient();


export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET!) as { userId: string; siteRole: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
}
};