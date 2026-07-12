# Multi-stage build for NestJS application
FROM node:24.12.0-bookworm-slim@sha256:04d9cbb7297edb843581b9bb9bbed6d7efb459447d5b6ade8d8ef988e6737804 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI="true"
ENV NODE_ENV="production"
RUN corepack enable
WORKDIR /app
FROM base AS builder
# Copy package files and install all dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm install --frozen-lockfile
# Copy configuration files
COPY tsconfig.json nest-cli.json ./
# Copy prisma schema directory and generate client
COPY prisma ./prisma
RUN pnpm exec prisma generate
# Copy source code and build
COPY src ./src
RUN pnpm run build
# Prune dev dependencies after build
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --prod
RUN pnpm prune --prod
# Production image
FROM base AS runner
# Create non-root user with specific home directory
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs --home /app nestjs
RUN chown -R nestjs:nodejs /app
# Copy necessary files from build stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
USER nestjs
EXPOSE 3000
ENTRYPOINT ["node"]
CMD ["dist/main.js"]