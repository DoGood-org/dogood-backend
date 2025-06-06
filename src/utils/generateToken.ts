import jwt from "jsonwebtoken";
import { Response } from "express";
import { JWT_SECRET } from "@/config/env";


export const generateToken = (
  payload: { userId: number; siteRole: "ADMIN" | "USER" },
  res: Response
) => {
  const token = jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};