# Mimics an AWS Lightsail "Node.js" instance: Ubuntu + Node + PM2 + Nginx + MySQL client
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ARG NODE_MAJOR=22

# Basic build tooling + Nginx (Lightsail's default reverse proxy) + MySQL client (server DB is MySQL 8.4)
# + Python3 (used by PythonSupport/ scripts) + PM2 prerequisites
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        nginx \
        default-mysql-client \
        python3 \
        python3-pip \
        python3-venv \
        rsync \
        unzip \
    && curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g npm@latest pm2 nodemon ts-node-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Match the Lightsail deployment layout where PM2/Nginx run under a service user
RUN mkdir -p /var/log/nginx /var/www \
    && chown -R vscode:vscode /var/www
