# Directus 12 images ship only `node` (no npm/npx/pnpm), so npm-hosted
# extensions are installed in a separate Node stage and copied in as
# regular extension folders.
ARG DIRECTUS_VERSION=12.7.0

FROM node:22-alpine AS ext
WORKDIR /ext
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts \
      directus-extension-computed-interface directus-extension-upsert \
 && mkdir -p /out \
 && for p in directus-extension-computed-interface directus-extension-upsert; do cp -r node_modules/$p /out/$p; done

FROM directus/directus:${DIRECTUS_VERSION}

USER root
COPY ./extensions /directus/extensions
COPY --from=ext /out/ /directus/extensions/
COPY ./templates /directus/templates
COPY ./migrations /directus/migrations
COPY ./snapshots /directus/snapshots
COPY ./config.cjs /directus/config.cjs
RUN chown -R node:node /directus/extensions /directus/templates /directus/migrations /directus/snapshots /directus/config.cjs

WORKDIR /directus
USER node
# Keep the image's own entrypoint: it runs `directus bootstrap` (migrations)
# and then starts pm2-runtime.
