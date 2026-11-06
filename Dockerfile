FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    DATABASE_PATH=/app/.data/wikirace.sqlite

WORKDIR /app
COPY package.json ./
COPY apps ./apps
RUN mkdir -p /app/.data

EXPOSE 3000
CMD ["node", "apps/server/src/server.js"]
