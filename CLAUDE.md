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

## Documentation lookups

Use the **context7** MCP tools (`resolve-library-id` then `query-docs`) to pull current docs for any library or framework touched in this repo (Express, React, Vite, Bun, Prisma, etc.) instead of relying on training data — these move fast enough that remembered APIs go stale. Resolve the library id once, then query it for the specific API or setup question at hand.
