import type { Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * safeParse `req.body` against `schema`. On failure, responds with 400 and the
 * first validation issue's message, then returns null; otherwise returns the
 * parsed value.
 */
export function parseBody<T>(
  schema: ZodType<T>,
  req: Request,
  res: Response,
): T | null {
  const parsed = schema.safeParse(req.body ?? {});

  if (parsed.success) return parsed.data;

  res.status(400).json({
    error: parsed.error.issues[0]?.message ?? "Invalid input",
  });
  return null;
}
