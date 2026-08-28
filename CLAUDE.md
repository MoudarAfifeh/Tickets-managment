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

## Data fetching

- Client-side server state uses **TanStack Query** (`@tanstack/react-query`) via `useQuery`/`useMutation`, not `useEffect`/`useState` fetch patterns. `QueryClientProvider` is set up in `client/src/main.tsx`.
- HTTP requests go through **axios**, not the raw `fetch` API — use the shared instance exported from `client/src/lib/api.ts` (`baseURL: "/api"`, so call e.g. `api.get("/users")` rather than `fetch("/api/users")`). See `client/src/pages/Users.tsx` for the pattern.

## Authentication

- Better Auth (`better-auth`) with the Prisma adapter, configured server-side in `server/src/lib/auth.ts`. Email/password only, with `disableSignUp: true` — accounts are created via the seed script (`server/prisma/seed.ts`, reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `server/.env`), not self-serve sign-up.
- `trustedOrigins` is pinned to the `TRUSTED_ORIGINS` env var, defaulting to `http://localhost:5173`. The client dev server must run on exactly that port — a second Vite instance drifting to 5174 (e.g. because 5173 was already taken) will silently fail auth requests (sign-in/out) with a 403.
- `User` has a `role` field (`admin` | `agent`, defaults to `agent`) added as a Better Auth `additionalFields` entry with `input: false`, so it can't be set from client-submitted data.
- Client side: `client/src/lib/auth-client.ts` creates `authClient` via `better-auth/react`, with the `inferAdditionalFields` plugin (from `better-auth/client/plugins`) declaring the `role` field inline — without it, `useSession()`'s `data.user` has no `role` in its TS type even though the field is present at runtime. Exports `useSession`, `signIn`, `signOut`.
- Route guards live in `client/src/components/ProtectedRoute.tsx`: `RequireAuth` redirects to `/login` when there's no session, `RedirectIfAuthed` redirects to `/` when there already is one, `RequireAdmin` redirects to `/login` when unauthenticated or `/` when authenticated but `role !== "admin"`. `/users` (`client/src/pages/Users.tsx`) is wrapped in `RequireAdmin` in `App.tsx`, and `NavBar.tsx` only renders the link to it when `data?.user.role === "admin"`.
- Rate limiting is gated to `NODE_ENV === "production"` only, at two layers: the `express-rate-limit` middleware `authLimiter` (`server/src/middleware/authLimiter.ts`, applied to `/api/auth/*splat` in `server/src/index.ts`) uses a `skip` callback; Better Auth's own built-in limiter (`rateLimit.enabled` in `server/src/lib/auth.ts`) is set the same way. Both are no-ops in dev and test — this matters because Playwright e2e tests fire repeated sign-in requests that would otherwise trip Better Auth's `/sign-in/email` custom rule (5 requests/10s).

## Testing

End-to-end tests use Playwright, in its own Bun workspace at `e2e/`. **Use the `e2e-test-writer` subagent (`.claude/agents/e2e-test-writer.md`) for all e2e test work** — writing new tests, updating existing ones, or fixing a failing test — instead of writing or editing files under `e2e/` directly. That agent owns the environment setup, database-isolation, and auth/credential conventions for this workspace; delegate to it rather than duplicating that knowledge here.

### Component tests

Component tests use **Vitest** + **React Testing Library**, run against `client/`. Config lives in `client/vitest.config.ts` (jsdom environment, `globals: true`, setup file `client/src/test/setup.ts` importing `@testing-library/jest-dom`) — no separate `vitest.setup` package is needed since it merges `client/vite.config.ts`.

- Colocate test files next to the component/page they cover, e.g. `client/src/pages/Users.tsx` → `client/src/pages/Users.test.tsx`.
- Wrap the component under test with `renderWithProviders` from `client/src/test/render.tsx` instead of manually assembling `QueryClientProvider`/`MemoryRouter` — it's the shared helper for all component tests and takes any `ReactNode`.
- Mock `axios` directly (not the `@/lib/api` wrapper) via `vi.hoisted`, since `client/src/lib/api.ts` calls `axios.create(...)` at module load time — a bare `vi.mock("axios")` or a post-import `mockReturnValue` is too late to affect that call. Pattern:
  ```ts
  const { mockedAxios } = vi.hoisted(() => {
    const mockedAxios = { get: vi.fn(), create: vi.fn() };
    mockedAxios.create.mockReturnValue(mockedAxios);
    return { mockedAxios };
  });
  vi.mock("axios", () => ({ default: mockedAxios }));
  ```
  Then drive responses per test with `mockedAxios.get.mockResolvedValue(...)` / `.mockRejectedValue(...)` / `.mockReturnValue(new Promise(() => {}))` (pending state), and reset with `mockedAxios.get.mockReset()` in `beforeEach`.
- Any component that renders `NavBar` (most pages) needs `@/lib/auth-client` mocked too — `NavBar` calls `useSession()` and `authClient.signOut`, both of which hit the network/Better Auth client if left real:
  ```ts
  vi.mock("@/lib/auth-client", () => ({
    useSession: () => ({ data: { user: { name: "Admin User", role: "admin" } } }),
    authClient: { signOut: vi.fn() },
  }));
  ```
- Run all component tests: `bun run test:component` (from `client/`), scoped to `src/pages` and `src/components`. `bun run test` runs the full Vitest suite once; `bun run test:watch` runs it in watch mode. See `client/src/pages/Users.test.tsx` for a full worked example.

## Documentation lookups

Use the **context7** MCP tools (`resolve-library-id` then `query-docs`) to pull current docs for any library or framework touched in this repo (Express, React, Vite, Bun, Prisma, etc.) instead of relying on training data — these move fast enough that remembered APIs go stale. Resolve the library id once, then query it for the specific API or setup question at hand.
