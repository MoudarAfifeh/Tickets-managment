# Single image for Railway: the Bun API (server/) serves the built React
# client (client/dist) from the same origin. Migrations and seeding run as
# Railway's pre-deploy step (see railway.json), not at build time — the
# database isn't reachable during the build.

FROM oven/bun:1.3.14 AS build
WORKDIR /app

# Install with every workspace manifest present so the lockfile matches.
COPY package.json bun.lock ./
COPY code/package.json code/
COPY server/package.json server/
COPY client/package.json client/
COPY e2e/package.json e2e/
RUN bun install --frozen-lockfile

COPY code code
COPY server server
COPY client client

# Vite inlines VITE_* variables at build time; Railway only passes service
# variables to a Dockerfile build when they're declared as ARGs.
ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN bun run --cwd client build

# prisma.config.ts reads DATABASE_URL, but generate never connects, so a
# placeholder is enough here; the real one is injected at runtime.
RUN cd server && DATABASE_URL="postgresql://build:build@localhost:5432/build" bunx --bun prisma generate


FROM oven/bun:1.3.14
WORKDIR /app
ENV NODE_ENV=production

# node_modules keeps dev dependencies on purpose: the pre-deploy step runs
# the Prisma CLI (`migrate deploy`) from this image.
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/code code
COPY --from=build /app/server server
COPY --from=build /app/client/dist client/dist

USER bun
EXPOSE 3000
CMD ["bun", "run", "--cwd", "server", "start"]
