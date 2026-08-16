import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";

export async function attachSession(req: Request, _res: Response, next: NextFunction) {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  req.session = result?.session ?? null;
  req.user = result?.user ?? null;
  next();
}
