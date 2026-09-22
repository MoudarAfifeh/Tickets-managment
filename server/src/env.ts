const required = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "TRUSTED_ORIGINS",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}. Check server/.env against server/.env.example.`,
  );
  process.exit(1);
}

// Not fatal: the app runs fine without it, but the inbound-email webhook
// (POST /api/webhooks/inbound-email) rejects every request with 500 until set.
if (!process.env.WEBHOOK_SECRET) {
  console.warn(
    "Warning: WEBHOOK_SECRET is not set — POST /api/webhooks/inbound-email will return 500 until it is.",
  );
}

// Not fatal: the app runs fine without it, but POST /api/tickets/:id/polish-reply
// rejects every request with 500 until set.
if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "Warning: OPENAI_API_KEY is not set — POST /api/tickets/:id/polish-reply will return 500 until it is.",
  );
}
