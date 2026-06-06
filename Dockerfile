FROM node:24-trixie-slim AS base

WORKDIR /app

RUN groupadd -g 999 appuser && useradd -u 999 -g 999 -m -d /home/appuser -s /bin/bash appuser

FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=appuser:appuser package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# `npm ci` produces native binaries; chown for downstream stages
RUN chown -R appuser:appuser /app

USER appuser

FROM deps AS test

COPY --chown=appuser:appuser . .
CMD ["npm", "test"]

FROM deps AS dev

EXPOSE 5173
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM deps AS build

COPY --chown=appuser:appuser . .
RUN mkdir -p /app/dist && npm run build

FROM base AS runtime

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

RUN mkdir -p /data /app && chown -R appuser:appuser /data /app

WORKDIR /app

COPY --from=deps --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appuser /app/dist ./dist
COPY --from=build --chown=appuser:appuser /app/server.cjs ./server.cjs
COPY --from=build --chown=appuser:appuser /app/package.json ./package.json

USER 999

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/data', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.cjs"]
