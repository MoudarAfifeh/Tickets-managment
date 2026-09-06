import type { Request, Response, NextFunction } from "express";

// Assumes `requireAuth` already ran and rejected an unauthenticated request
// with 401 — this only gates on role, so chain it as `requireAuth, requireAdmin`.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
