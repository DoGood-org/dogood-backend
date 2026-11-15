FROM node:24.12.0-bookworm-slim@sha256:04d9cbb7297edb843581b9bb9bbed6d7efb459447d5b6ade8d8ef988e6737804

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI="true"

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && mkdir /app \
    && chown node:node /app

USER node
WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node tsconfig.json tsconfig.build.json nest-cli.json ./
COPY --chown=node:node prisma ./prisma
RUN pnpm exec prisma generate

COPY --chown=node:node src ./src
RUN pnpm run build

EXPOSE 4000

CMD ["sh", "-c", "npx --no-install prisma migrate deploy && npx --no-install ts-node -r tsconfig-paths/register prisma/seed.ts && exec node dist/main.js"]
