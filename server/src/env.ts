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
