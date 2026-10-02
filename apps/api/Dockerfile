FROM node:22-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       calibre \
       xvfb \
       xauth \
       libgl1 \
       libglx0 \
       libx11-xcb1 \
       libxcb1 \
       libxcb-xinerama0 \
       libxcb-cursor0 \
       libxrender1 \
       libxi6 \
       libxrandr2 \
       libxfixes3 \
       libsm6 \
       libice6 \
       mesa-utils \
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
ENV QT_XCB_GL_INTEGRATION=none
ENV LIBGL_ALWAYS_SOFTWARE=1
ENV QTWEBENGINE_DISABLE_SANDBOX=1
ENV QTWEBENGINE_CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage"

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/web/package*.json apps/web/

RUN npm ci

COPY . .

RUN npm run build --workspace=api

CMD ["npm", "run", "start", "--workspace=api"]
