# syntax=docker/dockerfile:1

# ---- Build: install all workspace deps for the server and compile TypeScript
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --include-workspace-root=false

COPY server/ server/
RUN npm run build --workspace server

# ---- Runtime: production dependencies + compiled output only
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --include-workspace-root=false --omit=dev \
  && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY server/migrations server/migrations

USER node
WORKDIR /app/server
EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "dist/index.js"]
