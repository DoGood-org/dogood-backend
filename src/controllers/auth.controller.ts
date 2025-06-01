
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { loginSchema, signUpSchema } from "../utils/validation";
import { generateToken } from "../utils/generateToken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const signUp = async (req: Request, res: Response) => {
  try {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.format());

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        siteRole: "USER",
      },
    });

    generateToken({ userId: newUser.id, siteRole: newUser.siteRole }, res);

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      siteRole: newUser.siteRole,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const logIn = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.format());

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    generateToken({ userId: user.id, siteRole: user.siteRole }, res);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      siteRole: user.siteRole,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const logOut = (req: Request, res: Response) => {
  res.clearCookie("jwt");
  res.status(200).json({ message: "Logged out successfully" });
};


export const checkAuth = async (req: Request, res: Response) => {
    try {
        res.status(200).json(req.user);
    } catch (_error: unknown) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}