import express from "express";
import { signUp, logIn, logOut } from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const authRouter = express.Router();

authRouter.post("/signup", signUp);
authRouter.post("/login", logIn);
authRouter.post("/logout", logOut);
//router.get("/me", verifyToken, (req, res) => res.json({ user: req.user }));

export default authRouter;