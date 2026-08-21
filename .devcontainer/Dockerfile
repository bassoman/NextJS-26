# Mimics an AWS Lightsail "Node.js" instance: Ubuntu + Node + PM2 + Nginx
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ARG NODE_MAJOR=22

# Basic build tooling + Nginx (Lightsail's default reverse proxy)
# + Python3 (used by PythonSupport/ scripts) + PM2 prerequisites
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        nginx \
        python3 \
        python3-pip \
        python3-venv \
        rsync \
        unzip \
    && curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && case "$(dpkg --print-architecture)" in amd64) aws_arch=x86_64 ;; arm64) aws_arch=aarch64 ;; *) echo "Unsupported architecture" >&2; exit 1 ;; esac \
    && curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${aws_arch}.zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/aws /tmp/awscliv2.zip \
    && npm install -g npm@latest pm2 nodemon ts-node-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Match the Lightsail deployment layout where PM2/Nginx run under a service user
RUN mkdir -p /var/log/nginx /var/www \
    && chown -R vscode:vscode /var/www
