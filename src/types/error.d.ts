import { ErrorCode } from "@/constants/apiCodes";

export interface AppError extends Error {
  status?: number;
  code?: ErrorCode;
  details?: unknown;
}
