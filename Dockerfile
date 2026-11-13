FROM node:lts-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:lts-bookworm-slim AS backend
WORKDIR /build
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:lts-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production FRONTEND_DIR=/app/public PORT=3000
COPY --from=backend /build/package.json ./
COPY --from=backend /build/node_modules ./node_modules
COPY --from=backend /build/dist ./dist
COPY --from=frontend /build/dist ./public
RUN mkdir /app/images && chown node:node /app/images
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
