# Multi-stage build guna Next.js standalone output (next.config.mjs `output: "standalone"`).
# node:20-alpine — argon2 SEPATUTNYA guna prebuild musl linux-x64 sedia ada, tapi
# node-gyp-build gagal detect dalam alpine (diuji semasa Langkah 10) dan jatuh balik
# ke build-from-source — python3/make/g++ WAJIB ada untuk node-gyp, bukan pilihan.

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL/AUTH_SECRET placeholder — src/db/index.ts throw eager kalau tiada,
# route /api/auth/[...nextauth] import db semasa `next build` collect page data.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Docker auto-set HOSTNAME=<container id> untuk setiap container, dan Next.js
# standalone server.js guna process.env.HOSTNAME sebagai bind address kalau
# wujud — tanpa override ni app cuma dengar pada IP container sendiri, BUKAN
# 0.0.0.0, jadi localhost/127.0.0.1 dalam container sendiri (healthcheck ni,
# `docker exec`) dapat ECONNREFUSED walaupun akses luar melalui port-mapping
# nampak jalan. Diuji+disahkan semasa Langkah 10 (bug sebenar, bukan teori).
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]

# Stage berasingan untuk `drizzle-kit migrate` — output standalone `runner` di atas
# TIDAK bawa drizzle-kit/devDependencies (Next.js standalone hanya trace runtime
# deps sebenar app, bukan CLI tool). Guna `docker compose run --rm migrate`.
FROM node:20-alpine AS migrate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema ./src/db/schema
CMD ["npx", "drizzle-kit", "migrate"]
