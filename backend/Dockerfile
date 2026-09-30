FROM node:22-bookworm-slim AS node

FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# Node.js for the Remotion video renderer.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Emoji + Vietnamese/CJK fonts so headless Chromium renders every script correctly.
RUN apt-get update && apt-get install -y --no-install-recommends \
        fonts-noto-core fonts-noto-color-emoji ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python API + Playwright (infographic). --with-deps also installs the libraries Remotion's Chrome needs.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install --with-deps chromium

# Remotion: install, pre-bundle and download its headless Chrome at build time, not per request.
COPY video-renderer/package.json video-renderer/package-lock.json ./video-renderer/
RUN cd video-renderer && npm ci
COPY video-renderer ./video-renderer
RUN cd video-renderer && npm run bundle && npx remotion browser ensure
ENV REMOTION_BUNDLE_DIR=/app/video-renderer/build

COPY app ./app

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
