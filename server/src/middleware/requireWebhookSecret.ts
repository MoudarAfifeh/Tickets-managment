import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Guards webhook routes with the shared `WEBHOOK_SECRET`. The caller is an
 * external service, not a signed-in user, so there is no session here — the
 * secret is the whole credential. It may be sent as the `x-webhook-secret`
 * header or a `?secret=` query param.
 *
 * - 500 if `WEBHOOK_SECRET` is not configured on the server
 * - 401 if the caller's secret is missing or wrong
 */
export function requireWebhookSecret(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    res.status(500).json({ error: "Webhook secret is not configured" });
    return;
  }

  const provided =
    req.get("x-webhook-secret") ??
    (typeof req.query.secret === "string" ? req.query.secret : undefined);

  if (!provided || !timingSafeEqual(provided, expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
