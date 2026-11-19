# syntax=docker/dockerfile:1

# ---- Build: compile the React app to static files
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace client --include-workspace-root=false

COPY client/ client/
RUN npm run build --workspace client

# ---- Runtime: nginx serves the app and proxies /api to the server
FROM nginx:1.29-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
