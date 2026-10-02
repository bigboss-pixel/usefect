FROM node:22-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends calibre \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/

RUN npm ci

COPY . .

RUN npm run build --workspace=api

CMD ["npm", "run", "start", "--workspace=api"]
