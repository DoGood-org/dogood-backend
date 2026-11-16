FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS base
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI="true"
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
RUN pnpm exec prisma generate
COPY src ./src
RUN pnpm run build
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm prune --prod
RUN pnpm prune --prod

FROM base AS runner
ENV NODE_ENV="production"
RUN rm -rf /usr/local/lib/node_modules \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs -h /app nestjs && \
    chown -R nestjs:nodejs /app
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
USER nestjs
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
