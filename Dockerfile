# DEV STAGE
FROM node:22-slim AS dev


WORKDIR /backend

COPY . /backend/
RUN apt update -y \
 && apt install -y git cron lsof\
 && npm install \
 && npx prisma generate \
 && rm -rf /var/lib/apt/lists/* \
 && npm cache clean --force

EXPOSE 5000

CMD ["/bin/bash"]

# BUILD STAGE
FROM node:22-alpine AS build
WORKDIR /backend

COPY . /backend/

COPY package*.json /backend/

RUN npm ci && npx prisma generate 

RUN --mount=type=secret,id=env \
        set -a && . /run/secrets/env && set +a && npm run build
RUN npm prune --production




# PRODUCTION STAGE
FROM node:22-alpine AS prod
WORKDIR /backend

COPY --from=build /backend/prisma ./prisma
COPY --from=build /backend/package*.json ./package*.json
COPY --from=build /backend/package.json ./package.json
COPY --from=build /backend/node_modules ./node_modules
COPY --from=build /backend/dist ./dist


RUN npm install --production --ignore-scripts && npm cache clean --force 

ENV NODE_ENV=production
RUN --mount=type=secret,id=env \
        set -a && . /run/secrets/env && set +a &&  chown -R node:node /backend

USER node

EXPOSE 5000
CMD ["npm", "start"]