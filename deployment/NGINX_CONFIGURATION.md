# nginx Configuration for Multi-Admin Deployment

This document explains how to configure nginx as a reverse proxy for the CARC Next.js application in the new `/var/www/carc-app` architecture.

---

## Architecture Overview

```
┌─────────────────────┐
│   External Users    │
└──────────┬──────────┘
           │ HTTP/HTTPS (port 80/443)
           ▼
┌─────────────────────────────────────┐
│ nginx (reverse proxy)                │
│ - Handles SSL/TLS                   │
│ - Gzip compression                  │
│ - WebSocket upgrades                │
│ - Load balancing (optional)         │
└──────────┬──────────────────────────┘
           │ HTTP (port 3000/3001)
           ▼
┌─────────────────────────────────────┐
│ Node.js Application (carc-app)       │
│ - Runs as www-data:webadmins        │
│ - Listens on 127.0.0.1:3000 (prod)  │
│ - Listens on 127.0.0.1:3001 (sandbox)
└─────────────────────────────────────┘
```

---

## Configuration

### 1. Automatic Setup (Recommended)

The `configure-nginx.sh` script handles all configuration automatically:

```bash
# HTTP only
DOMAIN=example.com EMAIL=you@example.com bash deployment/scripts/configure-nginx.sh

# With Let's Encrypt HTTPS
DOMAIN=example.com EMAIL=you@example.com ENABLE_HTTPS=1 bash deployment/scripts/configure-nginx.sh

# Custom app directory
DOMAIN=example.com EMAIL=you@example.com APP_DIR=/var/www/carc-app APP_PORT=3000 \
  bash deployment/scripts/configure-nginx.sh
```

### 2. Manual Configuration

If you prefer manual setup:

```bash
# 1. Install nginx
sudo apt-get update
sudo apt-get install -y nginx

# 2. Create nginx site configuration
sudo tee /etc/nginx/sites-available/carc > /dev/null <<'NGINX_CONF'
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    client_max_body_size 10m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
NGINX_CONF

# 3. Enable the site
sudo ln -sf /etc/nginx/sites-available/carc /etc/nginx/sites-enabled/carc
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Configure WebSocket support
sudo tee /etc/nginx/conf.d/connection_upgrade.conf > /dev/null <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

# 5. Test and reload
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

---

## Configuration Parameters

### Environment Variables for `configure-nginx.sh`

| Variable | Default | Description |
|----------|---------|-------------|
| `DOMAIN` | _(required)_ | Canonical domain name (e.g., `example.com`) |
| `EMAIL` | _(required for HTTPS)_ | Let's Encrypt contact email |
| `APP_DIR` | `/var/www/carc-app` | App directory (informational only; nginx uses APP_PORT) |
| `APP_PORT` | `3000` | Port Node.js listens on |
| `WWW_ALIAS` | `1` | Also serve www.DOMAIN and redirect to DOMAIN |
| `SITE_NAME` | `carc` | nginx site file name (`/etc/nginx/sites-available/<name>`) |
| `CLIENT_MAX_BODY_SIZE` | `10m` | Upload size limit |
| `ENABLE_HTTPS` | `1` (if DOMAIN+EMAIL set) | Enable Let's Encrypt HTTPS |
| `CERTBOT_STAGING` | `0` | Use Let's Encrypt staging CA (for testing) |
| `NGINX_ENV_FILE` | `deployment/nginx.env` | Optional config file |

### Configuration File: `deployment/nginx.env`

Create this file to avoid passing environment variables each time:

```bash
# Copy to deployment/nginx.env (gitignored) and edit
DOMAIN=example.com
EMAIL=you@example.com
WWW_ALIAS=1
APP_DIR=/var/www/carc-app
APP_PORT=3000
SITE_NAME=carc
CLIENT_MAX_BODY_SIZE=10m
ENABLE_HTTPS=1
# CERTBOT_STAGING=1  # Uncomment to test Let's Encrypt
```

Then run without environment variables:

```bash
bash deployment/scripts/configure-nginx.sh
```

---

## File Permissions

nginx must be able to read the Node.js application, though it doesn't need write access (since it only acts as a proxy).

**Permissions are already correct:**
- `/var/www/carc-app` - owned by `www-data:webadmins`, mode 775 (g+s on directories)
- nginx runs as `www-data` user (standard on Ubuntu)
- nginx can read all application files

**Verify:**
```bash
# Check nginx user
ps aux | grep nginx
# Output should show nginx running as www-data

# Verify app directory permissions
ls -ld /var/www/carc-app
# Should show: drwxrwxr-x+ 1 www-data webadmins 4096 ... /var/www/carc-app

# Verify nginx can read files
sudo -u www-data test -r /var/www/carc-app/.env && echo "✓ Readable" || echo "✗ Not readable"
```

---

## HTTPS/Let's Encrypt Setup

### Prerequisites

1. **Domain DNS**: Must point to your Lightsail instance IP
2. **Ports open**: Firewall must allow inbound 80 and 443
3. **Email**: Valid email for Let's Encrypt notifications

### Automatic Setup

```bash
DOMAIN=example.com EMAIL=you@example.com ENABLE_HTTPS=1 bash deployment/scripts/configure-nginx.sh
```

The script will:
1. Install certbot and certbot-nginx plugin
2. Generate HTTPS certificate via Let's Encrypt
3. Auto-configure nginx with certificate
4. Redirect HTTP → HTTPS
5. Enable HSTS (HTTP Strict Transport Security)

### Manual Renewal

Let's Encrypt certificates expire in 90 days. Auto-renewal is configured:

```bash
# Check renewal status
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check certificates
sudo certbot certificates
```

---

## Troubleshooting

### nginx won't start

```bash
# Check syntax
sudo nginx -t

# View error logs
sudo tail -50 /var/log/nginx/error.log

# Common issues:
# - Port 80 already in use: sudo lsof -i :80
# - Permissions: /var/www/carc-app not readable by www-data
# - DNS: DOMAIN doesn't point to this server (for HTTPS)
```

### Certificate errors

```bash
# View certificate details
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# View certbot logs
sudo tail -50 /var/log/letsencrypt/letsencrypt.log

# Common issues:
# - DNS doesn't point to this IP
# - Ports 80/443 not open to public internet
# - Email address issues
```

### App not accessible

```bash
# Check if Node.js is running
sudo systemctl status carc-app@prod

# Check if Node.js is listening
sudo netstat -tlnp | grep 3000

# Check nginx reverse proxy logs
sudo tail -50 /var/log/nginx/access.log
sudo tail -50 /var/log/nginx/error.log

# Test direct connection to app
curl -I http://127.0.0.1:3000

# Test nginx
curl -I http://example.com
curl -I https://example.com  # If HTTPS configured
```

### WebSocket errors

WebSocket support is configured automatically. If you see WebSocket connection errors:

```bash
# Verify connection_upgrade.conf exists
sudo cat /etc/nginx/conf.d/connection_upgrade.conf

# Verify nginx includes it
sudo nginx -T | grep connection_upgrade
```

---

## Multiple Environments

To run sandbox alongside production:

```bash
# 1. App runs on multiple ports:
# - Production: 127.0.0.1:3000 (PORT=3000 in prod .env)
# - Sandbox: 127.0.0.1:3001 (PORT=3001 in sandbox .env)

# 2. Create separate nginx sites:

# Production site (main domain)
server {
    server_name example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        ...
    }
}

# Sandbox site (subdomain)
server {
    server_name sandbox.example.com;
    location / {
        proxy_pass http://127.0.0.1:3001;
        ...
    }
}

# 3. Run both systemd services:
sudo systemctl start carc-app@prod
sudo systemctl start carc-app@sandbox

# 4. Verify:
curl https://example.com        # Prod
curl https://sandbox.example.com # Sandbox
```

---

## Security Best Practices

### 1. Minimal nginx Permissions

nginx runs as `www-data` and only reads application files (via proxy):
- ✅ No write access needed
- ✅ Secrets in .env are not accessed by nginx directly
- ✅ nginx only proxies HTTP traffic

### 2. SSL/TLS Configuration

The script configures:
- ✅ Strong cipher suites
- ✅ TLS 1.2+ only (no SSL 3.0 or TLS 1.0/1.1)
- ✅ Perfect Forward Secrecy (PFS)
- ✅ HSTS (Strict-Transport-Security header)

### 3. gzip Compression

Enabled for text-based content:
- ✅ Reduces bandwidth
- ✅ Disabled for non-compressible content (images, videos)
- ✅ Safe for HTTPS

### 4. Rate Limiting (Optional)

For high-traffic sites, add rate limiting:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        ...
    }
}
```

---

## Monitoring

### Log Rotation

nginx logs are automatically rotated by Ubuntu. Verify:

```bash
sudo cat /etc/logrotate.d/nginx
```

### Check nginx Status

```bash
# Service status
sudo systemctl status nginx

# Active connections
sudo netstat -tlnp | grep nginx

# Configuration
sudo nginx -T
```

### Access Logs

```bash
# Real-time access log
sudo tail -f /var/log/nginx/access.log

# Real-time error log
sudo tail -f /var/log/nginx/error.log

# Analyze logs
sudo grep "502" /var/log/nginx/error.log  # Bad gateway (app down)
sudo grep "error" /var/log/nginx/error.log
```

---

## Performance Tuning

### Connection Pooling

```nginx
# Add to /etc/nginx/nginx.conf http context
upstream app_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        ...
    }
}
```

### Caching Static Content

If your app serves static files via public/ directory:

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    proxy_pass http://127.0.0.1:3000;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Load Balancing (Multiple Instances)

For multiple app instances:

```nginx
upstream carc_app {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
}

server {
    location / {
        proxy_pass http://carc_app;
        ...
    }
}
```

---

## Next Steps

1. **Configure nginx**: Run `configure-nginx.sh` with your domain
2. **Test access**: `curl https://example.com`
3. **Monitor logs**: `sudo tail -f /var/log/nginx/access.log`
4. **Set up monitoring**: CloudWatch or application performance monitoring
5. **Document domain**: Update DNS records, firewall rules in team docs

---

## Related Documentation

- [MULTI_ADMIN_SETUP.md](./MULTI_ADMIN_SETUP.md) - User and permission architecture
- [AWS_SSM_SETUP.md](./AWS_SSM_SETUP.md) - Environment variable management
- [DEPLOYMENT_MODERNIZATION.md](./DEPLOYMENT_MODERNIZATION.md) - Architecture details
- [setup.md](./setup.md) - Quick start guide
