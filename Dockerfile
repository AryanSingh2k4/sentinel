# =========================================================================
# Sentinel AI - Production Multi-Stage Dockerfile
# Embeds Next.js Frontend, BullMQ Worker, and Security CLI Tools
# =========================================================================

FROM node:20-bookworm-slim AS base

WORKDIR /app

# Install system dependencies (git, curl, tar, unzip, ca-certificates, redis-tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    tar \
    unzip \
    ca-certificates \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Download and install pre-compiled security tools (Nuclei, Katana, HTTPx, TruffleHog)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
      # Nuclei
      curl -sL https://github.com/projectdiscovery/nuclei/releases/download/v3.3.7/nuclei_3.3.7_linux_amd64.zip -o nuclei.zip && \
      unzip -q nuclei.zip nuclei && mv nuclei /usr/local/bin/ && rm nuclei.zip && \
      # Katana
      curl -sL https://github.com/projectdiscovery/katana/releases/download/v1.1.0/katana_1.1.0_linux_amd64.zip -o katana.zip && \
      unzip -q katana.zip katana && mv katana /usr/local/bin/ && rm katana.zip && \
      # HTTPx
      curl -sL https://github.com/projectdiscovery/httpx/releases/download/v1.6.9/httpx_1.6.9_linux_amd64.zip -o httpx.zip && \
      unzip -q httpx.zip httpx && mv httpx /usr/local/bin/ && rm httpx.zip && \
      # TruffleHog
      curl -sL https://github.com/trufflesecurity/trufflehog/releases/download/v3.88.2/trufflehog_3.88.2_linux_amd64.tar.gz -o trufflehog.tar.gz && \
      tar -xzf trufflehog.tar.gz trufflehog && mv trufflehog /usr/local/bin/ && rm trufflehog.tar.gz; \
    fi && \
    chmod +x /usr/local/bin/*

# Copy package dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build Next.js production bundle
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Expose web port
EXPOSE 3000

# Start script: launches background BullMQ worker and production Next.js server
CMD ["sh", "-c", "npx tsx worker.ts & npm run start"]
