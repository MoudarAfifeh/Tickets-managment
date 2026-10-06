import * as Sentry from "@sentry/react";

// Imported first in main.tsx. With no VITE_SENTRY_DSN the SDK stays disabled
// and every Sentry.* call is a no-op, so dev and tests need no Sentry project.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
