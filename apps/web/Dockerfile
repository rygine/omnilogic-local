# pinned to the minor
FROM node:26.8-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
# corepack's shim honors yarnPath, the checked-in yarn release
RUN npm i -g corepack && corepack enable
# only what an install reads
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
COPY packages/omnilogic-local-sdk/package.json packages/omnilogic-local-sdk/
COPY apps/web/package.json apps/web/prisma.config.ts apps/web/
# read by prisma generate in the web workspace's postinstall
COPY apps/web/src/schema.prisma apps/web/src/schema.prisma
COPY apps/web/src/server/db/database.ts apps/web/src/server/db/database.ts

FROM base AS build
# fetched tarballs, cached across builds and both install stages
# focus, since a full install without the other workspaces' manifests rewrites the lockfile
RUN --mount=type=cache,target=/app/.yarn/cache yarn workspaces focus @rygine/omnilogic-local-sdk @rygine/omnilogic-web
COPY tsconfig.base.json ./
COPY packages/omnilogic-local-sdk/tsconfig.json packages/omnilogic-local-sdk/tsdown.config.ts packages/omnilogic-local-sdk/
COPY packages/omnilogic-local-sdk/src packages/omnilogic-local-sdk/src
RUN yarn workspace @rygine/omnilogic-local-sdk build
COPY apps/web/tsconfig.json apps/web/vite.config.ts apps/web/
COPY apps/web/src apps/web/src
COPY brand brand
RUN yarn workspace @rygine/omnilogic-web build:image

FROM base AS prod-deps
RUN --mount=type=cache,target=/app/.yarn/cache yarn workspaces focus @rygine/omnilogic-web --production

FROM node:26.8-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/data
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
# the SDK, a workspace dependency linked from node_modules
COPY packages/omnilogic-local-sdk/package.json packages/omnilogic-local-sdk/
COPY --from=build /app/packages/omnilogic-local-sdk/dist packages/omnilogic-local-sdk/dist
# what prisma migrate deploy reads at start
COPY --from=base /app/apps/web apps/web
COPY apps/web/prisma apps/web/prisma
COPY --from=build /app/apps/web/.output apps/web/.output
WORKDIR /app/apps/web

EXPOSE 3000
HEALTHCHECK --start-period=20s --start-interval=2s --interval=10s \
  --timeout=3s --retries=3 CMD \
  node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
USER node
CMD ["sh", "-c", "../../node_modules/.bin/prisma migrate deploy && exec node .output/server/index.mjs"]
