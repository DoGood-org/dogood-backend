import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from '@/generated/prisma';


const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; siteRole: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
}
};