# =========================================
# Stage 1: Install Dependencies
# =========================================
FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# =========================================
# Stage 2: Build Application
# =========================================
FROM base AS build
WORKDIR /app

COPY . .
RUN bun run build

# =========================================
# Stage 3: Production Runner
# =========================================
FROM oven/bun:1-slim AS release
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./src
COPY --from=build /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma

# Copy entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
