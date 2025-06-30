import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "@/config/env";

type TokenPayload = {
  userId: number;
  siteRole: "ADMIN" | "USER";
};
type TokenType = "access" | "refresh";

export const generateToken = (
  payload: TokenPayload,
  tokenType: TokenType = "access",
) => {
  const token = jwt.sign(payload, tokenType === "access" ? JWT_SECRET! : JWT_REFRESH_SECRET!, { expiresIn: tokenType === "access" ? "7d" : "30d" });

  return token
};