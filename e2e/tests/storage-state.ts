import path from "node:path";

// Written by auth.setup.ts (the "setup" project), consumed by tests that
// need an already-authenticated session as a precondition.
export const ADMIN_STORAGE_STATE = path.resolve(
  import.meta.dirname,
  "../.auth/admin.json",
);
export const AGENT_STORAGE_STATE = path.resolve(
  import.meta.dirname,
  "../.auth/agent.json",
);
