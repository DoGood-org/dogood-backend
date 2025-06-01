import express from "express";
import { verifyToken } from "@/middlewares";
import { checkAuth, logIn, logOut, signUp } from "@/controllers/auth.controller";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Auth API
 */

export const authRoute = express.Router();

authRoute.post("/signup", signUp);

authRoute.post("/login", logIn);

authRoute.post("/logout", logOut);

authRoute.get("/check", verifyToken, checkAuth);


