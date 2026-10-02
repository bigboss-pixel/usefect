FROM node:22-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       calibre \
       xvfb \
       libgl1 \
       libegl1 \
       libopengl0 \
       libgbm1 \
       libasound2 \
       libxkbcommon0 \
       libnss3 \
       fonts-dejavu \
       fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV QT_QPA_PLATFORM=xcb
ENV LIBGL_ALWAYS_SOFTWARE=1
ENV QTWEBENGINE_DISABLE_SANDBOX=1
ENV QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-gpu --disable-dev-shm-usage --headless"

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/

RUN npm ci

COPY . .

RUN npm run build --workspace=api

CMD ["npm", "run", "start", "--workspace=api"]
