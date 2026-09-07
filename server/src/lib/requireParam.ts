import type { Request, Response } from "express";

/**
 * Reads a required string route param. Express 5's param type is
 * `string | string[]`, so on anything unexpected this responds with 400 and
 * returns null.
 */
export function requireParam(
  name: string,
  req: Request,
  res: Response,
): string | null {
  const value = req.params[name];

  if (typeof value !== "string") {
    res.status(400).json({ error: `Invalid ${name}` });
    return null;
  }

  return value;
}
