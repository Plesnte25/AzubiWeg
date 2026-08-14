import type { NextFunction, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(userId: string, opts?: { expiresIn?: SignOptions["expiresIn"] }): string {
  return jwt.sign({ userId } satisfies AuthPayload, config.jwtSecret, {
    expiresIn: opts?.expiresIn ?? "30d",
  });
}
