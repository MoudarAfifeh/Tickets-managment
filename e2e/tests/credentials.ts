// Reads seeded test-account credentials from the environment. Populated by
// playwright.config.ts via dotenv from server/.env.test — never hardcode
// these in a spec file.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Ensure server/.env.test defines it (see ` +
        `server/.env.test.example) and that playwright.config.ts loads it.`,
    );
  }
  return value;
}

export const ADMIN_EMAIL = requireEnv("ADMIN_EMAIL");
export const ADMIN_PASSWORD = requireEnv("ADMIN_PASSWORD");
export const AGENT_EMAIL = requireEnv("AGENT_EMAIL");
export const AGENT_PASSWORD = requireEnv("AGENT_PASSWORD");
