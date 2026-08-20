import { execSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  const serverDir = path.resolve(import.meta.dirname, "../server");

  execSync("bun run db:test:migrate", { cwd: serverDir, stdio: "inherit" });
  execSync("bun run db:test:seed", { cwd: serverDir, stdio: "inherit" });
}
