import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client";

// Express 5 forwards rejected promises from async handlers here, so route
// handlers don't need their own try/catch — they just throw (or let a query
// reject) and this maps known errors to responses.

// The field behind a P2002 lives in different places depending on the Prisma
// engine: `meta.target` (classic) or, with the pg driver adapter, nested under
// `meta.driverAdapterError.cause.constraint.fields`.
function uniqueField(err: Prisma.PrismaClientKnownRequestError): string {
  const meta = err.meta as
    | {
        target?: string | string[];
        driverAdapterError?: {
          cause?: { constraint?: { fields?: string[] } };
        };
      }
    | undefined;

  const adapterFields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(adapterFields) && adapterFields[0]) return adapterFields[0];

  const target = meta?.target;
  if (Array.isArray(target) && target[0]) return target[0];
  if (typeof target === "string") {
    return target.match(/_([a-z0-9]+)_key$/i)?.[1] ?? target;
  }
  return "value";
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    res.status(409).json({
      error: `A user with that ${uniqueField(err)} already exists`,
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
