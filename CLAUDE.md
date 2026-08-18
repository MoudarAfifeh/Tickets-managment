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
- `trustedOrigins` is pinned to the `CLIENT_URL` env var, defaulting to `http://localhost:5173`. The client dev server must run on exactly that port — a second Vite instance drifting to 5174 (e.g. because 5173 was already taken) will silently fail auth requests (sign-in/out) with a 403.
- `User` has a `role` field (`admin` | `agent`, defaults to `agent`) added as a Better Auth `additionalFields` entry with `input: false`, so it can't be set from client-submitted data.
- Client side: `client/src/lib/auth-client.ts` creates `authClient` via `better-auth/react` and exports `useSession`, `signIn`, `signOut`. Route guards live in `client/src/components/ProtectedRoute.tsx`: `RequireAuth` redirects to `/login` when there's no session, `RedirectIfAuthed` redirects to `/` when there already is one.

## Documentation lookups

Use the **context7** MCP tools (`resolve-library-id` then `query-docs`) to pull current docs for any library or framework touched in this repo (Express, React, Vite, Bun, Prisma, etc.) instead of relying on training data — these move fast enough that remembered APIs go stale. Resolve the library id once, then query it for the specific API or setup question at hand.
