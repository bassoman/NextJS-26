# CARC Deployment Documentation

Complete guide to deploying CARC on Ubuntu Lightsail with production-standard multi-admin access and secure configuration management.

---

## 📚 Documentation Index

### Quick Start (Begin Here)
- **[setup.md](./setup.md)** - Quick start guide for first deployment
- **[NGINX_CONFIG_REFERENCE.md](./NGINX_CONFIG_REFERENCE.md)** - Copy-paste commands for common tasks

### Multi-Admin Architecture
- **[MULTI_ADMIN_SETUP.md](./MULTI_ADMIN_SETUP.md)** - Complete multi-user deployment model with permissions
- **[DEPLOYMENT_MODERNIZATION.md](./DEPLOYMENT_MODERNIZATION.md)** - Architecture details and design rationale

### Permissions & Troubleshooting
- **[PERMISSION_FIXES.md](./PERMISSION_FIXES.md)** - Permission model and fixes for EACCES errors
- **[MANUAL_FIX_REFERENCE.md](./MANUAL_FIX_REFERENCE.md)** - Manual permission fixes (what the scripts do automatically)

### Environment Variables & Secrets
- **[AWS_SSM_SETUP.md](./AWS_SSM_SETUP.md)** - Store secrets in AWS Parameter Store
- **[nginx.env.example](./nginx.env.example)** - nginx configuration template

### nginx Reverse Proxy
- **[NGINX_CONFIGURATION.md](./NGINX_CONFIGURATION.md)** - Complete nginx setup guide
- **[NGINX_TROUBLESHOOTING.md](./NGINX_TROUBLESHOOTING.md)** - Comprehensive troubleshooting guide
- **[NGINX_CONFIG_REFERENCE.md](./NGINX_CONFIG_REFERENCE.md)** - Quick reference for viewing configs

### Scripts
- **[scripts/lightsail-setup.sh](./scripts/lightsail-setup.sh)** - Main deployment automation
- **[scripts/setup-deployment-users.sh](./scripts/setup-deployment-users.sh)** - User and group management
- **[scripts/configure-nginx.sh](./scripts/configure-nginx.sh)** - nginx setup with Let's Encrypt
- **[scripts/fetch-ssm-params.sh](./scripts/fetch-ssm-params.sh)** - Environment variable fetcher

### Systemd Configuration
- **[systemd/](./systemd/)** - Service definitions
- **[sudoers-carc-deployers.template](./sudoers-carc-deployers.template)** - Sudoers configuration

---

## 🚀 Quick Start (3 Steps)

### 1. Deploy Fresh Instance

```bash
ssh ubuntu@<lightsail-ip>
git clone https://github.com/bassoman/NextJS-26.git
cd NextJS-26
DOMAIN=example.com EMAIL=admin@example.com bash deployment/scripts/lightsail-setup.sh
```

### 2. Create Admin Users

```bash
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh \
  --user alice --password "pass" --deployer --pubkey alice_id_rsa.pub
```

### 3. Test Access

```bash
curl https://example.com
```

---

## 📖 How to Use This Documentation

### For First-Time Deployment
1. Read: [setup.md](./setup.md)
2. Run: [scripts/lightsail-setup.sh](./scripts/lightsail-setup.sh)
3. Reference: [NGINX_CONFIGURATION.md](./NGINX_CONFIGURATION.md)

### For Understanding the Architecture
1. Read: [DEPLOYMENT_MODERNIZATION.md](./DEPLOYMENT_MODERNIZATION.md)
2. Read: [MULTI_ADMIN_SETUP.md](./MULTI_ADMIN_SETUP.md)
3. Reference: [sudoers-carc-deployers.template](./sudoers-carc-deployers.template)

### For Day-to-Day Operations
1. Quick lookup: [NGINX_CONFIG_REFERENCE.md](./NGINX_CONFIG_REFERENCE.md)
2. Deploy updates: See MULTI_ADMIN_SETUP.md → "Day-to-Day Operations"
3. Manage users: [scripts/setup-deployment-users.sh](./scripts/setup-deployment-users.sh)

### When Something Breaks
1. Quick diagnosis: [NGINX_CONFIG_REFERENCE.md](./NGINX_CONFIG_REFERENCE.md)
2. Detailed guide: [NGINX_TROUBLESHOOTING.md](./NGINX_TROUBLESHOOTING.md)
3. Environment variables: [AWS_SSM_SETUP.md](./AWS_SSM_SETUP.md)

---

## 🏗️ Architecture Overview

```
┌─ Users ──────────────────┐
│ • alice (deployer)       │
│ • bob (webadmin)         │
│ (members of webadmins)   │
└──────────┬───────────────┘
           │ SSH + Git
           ▼
┌─────────────────────────────────┐
│ /var/www/carc-app               │
│ (www-data:webadmins, 775, g+s)  │
│ • Repository                    │
│ • Application code              │
│ • .env (640 www-data:webadmins) │
└──────────┬────────────────────┬─┘
           │ systemd unit       │
           │ carc-app@prod      │
           │                    │
           ▼                    ▼
    ┌─────────────┐        ┌──────────────┐
    │ Node.js app │        │ .env file    │
    │ (www-data)  │        │ (secrets)    │
    │ :3000       │        └──────────────┘
    └──────┬──────┘
           │ localhost:3000
           ▼
    ┌──────────────────────┐
    │ nginx (reverse proxy)│
    │ (www-data)           │
    │ :80, :443            │
    └──────────┬───────────┘
               │ HTTPS
               ▼
          Internet
```

---

## 📋 Directory Structure

```
deployment/
├── README.md                           # This file
├── setup.md                            # Quick start guide
├── MULTI_ADMIN_SETUP.md                # User architecture
├── DEPLOYMENT_MODERNIZATION.md         # Design rationale
├── AWS_SSM_SETUP.md                    # Secrets management
├── NGINX_CONFIGURATION.md              # nginx setup guide
├── NGINX_TROUBLESHOOTING.md            # Troubleshooting
├── NGINX_CONFIG_REFERENCE.md           # Quick commands
├── nginx.env.example                   # nginx config template
├── sudoers-carc-deployers.template     # Sudoers config
├── scripts/
│   ├── lightsail-setup.sh             # Main deployment script
│   ├── setup-deployment-users.sh      # User management
│   ├── configure-nginx.sh             # nginx installer
│   ├── fetch-ssm-params.sh            # SSM parameter fetcher
│   └── ...other scripts...
└── systemd/
    ├── carc-app@.service              # Application service
    └── ...other services...
```

---

## 🔑 Key Concepts

### Multi-Admin Architecture
- **Individual users** (alice, bob) with SSH access and personal home directories
- **Service account** (www-data) that runs the application
- **Groups** (webadmins, deployers) for permission management
- **Shared code** at `/var/www/carc-app` with setgid for seamless collaboration

### File Permissions
- **Application directory** `/var/www/carc-app` - mode 775 with group ownership
- **.env file** - mode 640 (read-only for others, www-data:webadmins)
- **Directories** - g+s bit set so files inherit group ownership
- **Deployments** - Seamless file sharing without permission conflicts

### Environment Variables
- **Manual .env** - Input during setup (default)
- **AWS SSM** - Use Parameter Store for secrets (production recommended)
- **Per-environment** - Support for prod (3000) and sandbox (3001)

### Services
- **carc-app@prod** - Production Next.js application
- **carc-app@sandbox** - Sandbox/test environment (optional)
- **nginx** - Reverse proxy with HTTPS/Let's Encrypt

---

## 🎯 Common Tasks

### Deploy New Code
```bash
cd /var/www/carc-app
git pull
npm ci && npm run build
sudo systemctl restart carc-app@prod
```

### Create New Deployer
```bash
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh \
  --user newuser --deployer
```

### Update Environment Variables
```bash
# Manual update
sudo vim /var/www/carc-app/.env
sudo systemctl restart carc-app@prod

# Or via SSM
sudo bash /var/www/carc-app/deployment/scripts/fetch-ssm-params.sh
sudo systemctl restart carc-app@prod
```

### Check nginx Configuration
```bash
sudo nginx -T              # See all loaded config
sudo cat /etc/nginx/sites-enabled/carc  # See site config
sudo systemctl status nginx  # Check status
```

### View Logs
```bash
sudo tail -f /var/log/nginx/error.log   # nginx errors
sudo tail -f /var/log/nginx/access.log  # nginx access
journalctl -u carc-app@prod -f          # App logs
```

---

## 🔒 Security Features

- ✅ **Multi-user isolation** - Individual SSH accounts with separate home directories
- ✅ **Principle of least privilege** - Deployers can only do deployments, webadmins read-only
- ✅ **File ownership** - www-data runs app, can't write deployment code
- ✅ **HTTPS/TLS** - Automatic Let's Encrypt with auto-renewal
- ✅ **Secret management** - .env file restricted to app user and admins
- ✅ **AWS SSM integration** - Encrypted secrets with audit logging
- ✅ **Sudoers control** - NOPASSWD for specific deployment tasks only
- ✅ **Group setgid** - Files created by one admin accessible to all admins

---

## 📞 Getting Help

### Problem: Can't access the app through nginx?
→ See [NGINX_TROUBLESHOOTING.md](./NGINX_TROUBLESHOOTING.md)

### Problem: Permission denied when deploying?
→ See [MULTI_ADMIN_SETUP.md](./MULTI_ADMIN_SETUP.md) → "Troubleshooting"

### Problem: Environment variables not working?
→ See [AWS_SSM_SETUP.md](./AWS_SSM_SETUP.md) → "Troubleshooting"

### Problem: User can't SSH or doesn't have rights?
→ See [MULTI_ADMIN_SETUP.md](./MULTI_ADMIN_SETUP.md) → "User Management"

---

## 📊 Comparison: Old vs New Architecture

| Aspect | Old (`~/NextJS-26`) | New (`/var/www/carc-app`) |
|--------|-------------------|--------------------------|
| **Location** | Home directory | FHS-standard /var/www |
| **User** | Single `ubuntu` | Multiple admins + `www-data` |
| **Permissions** | Simple, error-prone | Robust with groups |
| **Isolation** | None | Service account separation |
| **Collaboration** | Permission conflicts | Setgid handles it |
| **Secrets** | Manual .env | AWS SSM or manual |
| **nginx config** | Custom paths | Standard /var/www path |
| **Scalability** | Limited to 1 user | Unlimited admins |

---

## ✅ Verification Checklist

After deployment:
- [ ] App runs on 127.0.0.1:3000
- [ ] nginx listens on 0.0.0.0:80
- [ ] Admin users can SSH
- [ ] Admin users can read/write `/var/www/carc-app`
- [ ] Deployers can restart services
- [ ] .env file is readable by app, not others
- [ ] nginx proxies to app correctly
- [ ] HTTPS certificate works
- [ ] Database files are created with correct ownership
- [ ] All logs are readable by admins

---

## 🔄 Version History

- **v2.0** - Multi-admin architecture (current)
  - Multiple user accounts
  - Service account isolation
  - Group-based permissions
  - Automatic environment variable setup
  - AWS SSM integration

- **v1.0** - Single-user home directory
  - Simple deployment
  - Limited to one user
  - Manual configuration

---

## 📖 Related Resources

- [Ubuntu Filesystem Hierarchy Standard (FHS)](https://wiki.ubuntu.com/FilesystemHierarchyStandard)
- [nginx Documentation](https://nginx.org/en/docs/)
- [systemd Documentation](https://www.freedesktop.org/wiki/Software/systemd/)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store.html)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Status**: Production-ready deployment system with comprehensive documentation
