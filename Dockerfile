FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

RUN groupadd -g 999 appuser && useradd -u 999 -g 999 -m -d /home/appuser -s /bin/bash appuser \
    && mkdir -p /data /app \
    && chown -R appuser:appuser /data /app

WORKDIR /app

COPY --from=build --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appuser /app/dist ./dist
COPY --from=build --chown=appuser:appuser /app/server.cjs ./server.cjs
COPY --from=build --chown=appuser:appuser /app/package.json ./package.json

USER 999

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/data', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.cjs"]
