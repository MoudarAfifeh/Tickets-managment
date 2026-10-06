import * as Sentry from "@sentry/bun";

// Imported first in index.ts (after env), so the SDK is initialised before
// anything else loads. With no SENTRY_DSN the SDK stays disabled: every
// Sentry.* call becomes a no-op, so dev and test run without a Sentry project.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
});
