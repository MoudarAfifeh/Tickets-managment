import type { Request, Response, NextFunction } from "express";

/**
 * Guards AI routes that call OpenAI. `OPENAI_API_KEY` is a non-fatal env var
 * (see server/src/env.ts) — the app runs fine without it, but these routes
 * are unusable until it's set.
 */
export function requireOpenAiKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "AI features are not configured" });
    return;
  }
  next();
}
