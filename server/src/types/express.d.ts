import type { auth } from "../lib/auth";

type AuthSession = typeof auth.$Infer.Session;

declare global {
  namespace Express {
    interface Request {
      session: AuthSession["session"] | null;
      user: AuthSession["user"] | null;
    }
  }
}
