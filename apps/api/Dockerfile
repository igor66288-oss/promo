FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/widget/package.json ./packages/widget/
RUN pnpm install --frozen-lockfile

COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

WORKDIR /app/apps/api
RUN pnpm exec prisma generate && pnpm exec tsc -p tsconfig.json

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/widget/package.json ./packages/widget/
RUN pnpm install --frozen-lockfile

COPY apps/api/prisma ./apps/api/prisma
COPY packages/widget/ ./packages/widget/

WORKDIR /app/apps/api
RUN pnpm exec prisma generate

COPY --from=builder /app/apps/api/dist ./dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema=prisma/schema.prisma && node dist/main.js"]
