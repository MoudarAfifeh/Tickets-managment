# Ticket Management System

AI-powered support ticket system. See `project-scope.md` for the product spec, `tech-stack.md` for the intended full stack, and `implementation-plan.md` for the phased build plan.

## Structure

- `server/` — Express + TypeScript API, run with Bun. Entry point: `server/src/index.ts`. Dev port: 3000.
- `client/` — React + TypeScript frontend (Vite), run with Bun. Dev server proxies `/api` to `http://localhost:3000` (see `client/vite.config.ts`).
- Bun workspaces tie the two together (root `package.json`).

## Running

- `bun run dev:server` — start the API with watch mode
- `bun run dev:client` — start the Vite dev server
- Run both to work on the full stack; the client calls the API through the `/api` proxy, not a hardcoded port.

## Database

- Prisma ORM against PostgreSQL. Schema: `server/prisma/schema.prisma` (models: `User`, `Session`, `Ticket`, `Message`). Generated client output: `server/src/generated/prisma` (gitignored, regenerate with `bunx --bun prisma generate`).
- Local dev database: `npx prisma dev` (from `server/`) — Prisma's own embedded Postgres, no Docker or system Postgres install needed. **Must run under `npx`/Node, not Bun** — `bunx --bun prisma dev` fails building its PGlite runtime asset under Bun's bundler. Other Prisma commands (`generate`, `migrate dev`, `db push`) work fine under `bunx --bun`.
- Start `npx prisma dev` first and leave it running, then set `DATABASE_URL` in `server/.env` to the connection string it prints (changes each fresh start — copy it in). `server/prisma.config.ts` loads `.env` via `dotenv/config` so this works under both Bun and Node.
- Migrations: `bunx --bun prisma migrate dev --name <name>` from `server/`, applied migrations live in `server/prisma/migrations/` (committed to git).

## Styling & UI components

- Tailwind CSS v4 via `@tailwindcss/vite` — there is no `tailwind.config.js`; theme tokens (colors, radii, fonts) live in `client/src/index.css` as CSS custom properties, mapped through `@theme inline`, with separate `:root` / `.dark` blocks for light/dark values.
- shadcn/ui is installed (`client/components.json`, style `base-nova`, base color `neutral`). Generated primitives in `client/src/components/ui/` wrap **`@base-ui/react`**, not Radix — this shadcn CLI version (`shadcn@^4.18`) targets Base UI.
- Add components with `bunx --bun shadcn add <name>` from `client/`. The registry's `form` component is an empty stub in this version (`shadcn add form` produces nothing) — don't rely on it; wire `react-hook-form`'s `register()`/`errors` directly to `Input`/`Label` inside a `Card` instead (see `client/src/pages/Login.tsx` for the pattern).
- Path alias `@/*` → `client/src/*` is configured in `client/tsconfig.json`, `client/tsconfig.app.json`, and `client/vite.config.ts` (the alias uses `import.meta.dirname`, not `__dirname`, to avoid a Vite native-config-loader deprecation warning).

## Authentication

- Better Auth (`better-auth`) with the Prisma adapter, configured server-side in `server/src/lib/auth.ts`. Email/password only, with `disableSignUp: true` — accounts are created via the seed script (`server/prisma/seed.ts`, reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `server/.env`), not self-serve sign-up.
- `trustedOrigins` is pinned to the `TRUSTED_ORIGINS` env var, defaulting to `http://localhost:5173`. The client dev server must run on exactly that port — a second Vite instance drifting to 5174 (e.g. because 5173 was already taken) will silently fail auth requests (sign-in/out) with a 403.
- `User` has a `role` field (`admin` | `agent`, defaults to `agent`) added as a Better Auth `additionalFields` entry with `input: false`, so it can't be set from client-submitted data.
- Client side: `client/src/lib/auth-client.ts` creates `authClient` via `better-auth/react`, with the `inferAdditionalFields` plugin (from `better-auth/client/plugins`) declaring the `role` field inline — without it, `useSession()`'s `data.user` has no `role` in its TS type even though the field is present at runtime. Exports `useSession`, `signIn`, `signOut`.
- Route guards live in `client/src/components/ProtectedRoute.tsx`: `RequireAuth` redirects to `/login` when there's no session, `RedirectIfAuthed` redirects to `/` when there already is one, `RequireAdmin` redirects to `/login` when unauthenticated or `/` when authenticated but `role !== "admin"`. `/users` (`client/src/pages/Users.tsx`) is wrapped in `RequireAdmin` in `App.tsx`, and `NavBar.tsx` only renders the link to it when `data?.user.role === "admin"`.
- Rate limiting is gated to `NODE_ENV === "production"` only, at two layers: the `express-rate-limit` middleware `authLimiter` (`server/src/middleware/authLimiter.ts`, applied to `/api/auth/*splat` in `server/src/index.ts`) uses a `skip` callback; Better Auth's own built-in limiter (`rateLimit.enabled` in `server/src/lib/auth.ts`) is set the same way. Both are no-ops in dev and test — this matters because Playwright e2e tests fire repeated sign-in requests that would otherwise trip Better Auth's `/sign-in/email` custom rule (5 requests/10s).

## Testing

- End-to-end tests use Playwright, in its own Bun workspace at `e2e/` (config: `e2e/playwright.config.ts`). No tests exist yet — this is setup/config only.
- `e2e/playwright.config.ts` starts both dev servers itself via `webServer` (an array: API + client) before running tests, targeting `baseURL: http://localhost:5173`. The API entry always starts its own server (`reuseExistingServer: false`) rather than reusing one that's already running — an already-running dev server would be pointed at the dev database, not the test one, and reusing it would silently run tests against the wrong data.
- Tests need a database that's genuinely separate from the dev one (not just a different schema **or a different database on the same instance**), because `db:test:migrate` (`prisma migrate deploy`, no prompts) and the seed script run against it non-interactively. Start a second, separately named local Postgres instance from `server/`: `npx prisma dev --name test` (same **must run under `npx`/Node, not Bun** caveat as the dev instance, see Database section above). Copy its printed connection string into `server/.env.test` (copy from `server/.env.test.example`).
- **A second database on the same `prisma dev` instance does NOT give real isolation — don't do it.** This local Postgres is Prisma's embedded PGlite (WASM), confirmed via `pg_database`/`version()` — not a normal multi-database Postgres server. `CREATE DATABASE test_db`, even `TEMPLATE template0` (Postgres's pristine template), still shares the same underlying storage as the connected database: verified empirically by creating it, seeing it contain the dev DB's existing tables *and* rows, dropping/recreating from `template0`, and seeing the exact same data reappear. Two `prisma dev` databases on one instance are the same data wearing two names. Genuine isolation requires a separate **process** (a separate `--name` instance on its own port), which is what the two-instance setup above already does — don't "simplify" it back to one instance with two databases.
- To browse the dev and test databases in a GUI client (DataGrip, TablePlus, etc.), add **two separate data source connections**, one per instance/port (both use database name `template1`, user/password `postgres`/`postgres` — only the port differs, and it changes on every fresh `prisma dev` start, so update the saved connection's port when that happens). JDBC-style clients want `jdbc:postgresql://<host>:<port>/template1?sslmode=disable`, not the `postgres://...` URL form used elsewhere in this doc.
- `server/.env.test` is loaded automatically instead of `server/.env` whenever `NODE_ENV=test` — this is Bun's built-in `.env`/`.env.test` precedence, not a custom loader (`server/prisma.config.ts`'s `dotenv/config` doesn't override already-set vars, so it doesn't fight this). The `server/package.json` scripts `dev:test`, `db:test:migrate`, `db:test:seed` all set `NODE_ENV=test` for this reason.
- One-time setup after creating `server/.env.test`: `bun run --cwd server db:test:migrate` then `bun run --cwd server db:test:seed`.
- Install Playwright's browser binaries once: `bunx playwright install chromium` — **not** `bunx --bun`, which crashes Playwright's child-process spawning (same `--bun` incompatibility class as the Prisma dev caveat, different root cause). `bun run test:e2e` (the normal way tests get run, via the `playwright test` script) is unaffected — the incompatibility only shows up invoking the `playwright` binary directly through `bunx --bun`.
- Run tests: `bun run test:e2e` from the repo root (or `bun run --cwd e2e test`).

## Documentation lookups

Use the **context7** MCP tools (`resolve-library-id` then `query-docs`) to pull current docs for any library or framework touched in this repo (Express, React, Vite, Bun, Prisma, etc.) instead of relying on training data — these move fast enough that remembered APIs go stale. Resolve the library id once, then query it for the specific API or setup question at hand.
