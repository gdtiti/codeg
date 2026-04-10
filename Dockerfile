# Stage 1: Build Next.js static export
FROM node:22-alpine AS frontend
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY src/ ./src/
COPY public/ ./public/
COPY next.config.ts tsconfig.json postcss.config.mjs components.json ./
RUN pnpm build

# Stage 2: Build Rust server binary
FROM rust:slim-bookworm AS backend
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app/src-tauri
COPY src-tauri/ ./
RUN cargo build --release --bin codeg-server --no-default-features

# Stage 3: Runtime
FROM node:22-bookworm-slim
LABEL org.opencontainers.image.source="https://github.com/gdtiti/codeg"
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    git \
    openssh-client \
    ca-certificates \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/hf-sync \
    && /opt/hf-sync/bin/pip install --no-cache-dir "huggingface_hub>=0.31,<1"

COPY --from=backend /app/src-tauri/target/release/codeg-server /usr/local/bin/codeg-server
COPY --from=frontend /app/out /app/web
COPY docker/hf_data_sync.py /usr/local/bin/hf-data-sync
COPY docker/codeg-entrypoint.sh /usr/local/bin/codeg-entrypoint

RUN chmod +x /usr/local/bin/hf-data-sync /usr/local/bin/codeg-entrypoint \
    && mkdir -p /data \
    && chmod 0777 /data

ENV CODEG_STATIC_DIR=/app/web
ENV CODEG_DATA_DIR=/data
ENV CODEG_PORT=3080
ENV CODEG_HOST=0.0.0.0
ENV SHELL=/bin/bash
ENV PATH=/opt/hf-sync/bin:$PATH

EXPOSE 3080
VOLUME /data

ENTRYPOINT ["codeg-entrypoint"]
CMD ["codeg-server"]
