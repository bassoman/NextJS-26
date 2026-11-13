# Deployment Permission Fixes

## Overview

This document describes the permission fixes applied to the deployment scripts to prevent EACCES errors when running npm install, build, and other deployment operations.

## The Problem

When deploying to production at `/var/www/carc-app`, npm operations would fail with permission errors:

```
npm error code EACCES
npm error syscall unlink
npm error path /var/www/carc-app/node_modules/.package-lock.json
npm error errno -13
npm error [Error: EACCES: permission denied, unlink '/var/www/carc-app/node_modules/.package-lock.json']
```

This occurred because:

1. **Directory ownership mismatch**: `/var/www/carc-app` was owned by `ubuntu` user, but npm was running as `www-data`
2. **npm cache issues**: `/var/www/.npm` cache was created with root permissions, blocking www-data access
3. **Group permissions missing**: The `webadmins` group didn't exist or wasn't properly configured
4. **Missing parent directories**: Parent directories weren't created with proper permissions before operations

## The Solution

### 1. Directory Ownership Model

All deployment scripts now enforce the **multi-admin architecture**:

```
Owner: www-data (service user)
Group: webadmins (multi-admin group)
Permissions: 775 (u+rwX, g+rwX, o+rX)
Setgid: Enabled on all directories (g+s)
```

This ensures:
- The service account (www-data) can run the app
- All webadmins group members can read/write
- Files created by any group member inherit group ownership
- No permission conflicts between admins

### 2. Scripts Modified

#### lightsail-setup.sh (Primary Deployment Script)

**Early initialization**:
```bash
# Ensure parent directory exists with correct permissions
sudo mkdir -p /var/www
sudo chown www-data:webadmins /var/www
sudo chmod 775 /var/www
sudo chmod g+s /var/www
```

**After git clone**:
```bash
# Fix ownership after clone (git creates files as current user)
sudo chown -R www-data:webadmins "$APP_DIR"
sudo chmod -R u+rwX,g+rwX,o+rX "$APP_DIR"
sudo find "$APP_DIR" -type d -exec chmod g+s {} +
```

**Before npm operations**:
```bash
# Initialize deployment users and directories (creates groups)
sudo bash deployment/scripts/setup-deployment-users.sh --init-directories

# Fix npm cache permissions
sudo chown -R www-data:webadmins /var/www/.npm 2>/dev/null || true

# Build as www-data (not root, not ubuntu)
sudo -u "$SERVICE_USER" npm install
sudo -u "$SERVICE_USER" npm run build
```

**Changes**:
- Moved `setup-deployment-users.sh --init-directories` BEFORE npm operations (ensures groups exist)
- Changed from `npm ci` to `npm install` (ci requires package-lock.json)
- Added npm cache permission fix
- Changed build to run as `www-data` (not current user)
- Fixed .env file ownership immediately after creation

#### fetch-ssm-params.sh (Environment Variable Script)

**Parent directory creation**:
```bash
# Create target directory with proper permissions
mkdir -p "$TARGET_ENV_DIR"
if [[ $EUID -eq 0 ]]; then
    chown "$SERVICE_USER:$SERVICE_GROUP" "$TARGET_ENV_DIR"
    chmod 755 "$TARGET_ENV_DIR"
fi
```

**Changes**:
- Creates parent directories if missing
- Sets ownership to www-data:webadmins if running as root
- No longer fails if directory doesn't exist

#### initialize-databases.sh (Database Setup Script)

**Group creation**:
```bash
# Ensure groups exist
for group_name in "$SERVICE_GROUP" "deployers"; do
    if ! getent group "$group_name" >/dev/null 2>&1; then
        echo "INFO: Creating group: $group_name"
        groupadd "$group_name"
    fi
done
```

**Parent directory creation**:
```bash
# Create parent directories (/var/carc, /var/carc/prod, /var/carc/prod/data, etc.)
mkdir -p "$target_dir"

# Set ownership and permissions: www-data:webadmins, 770, with setgid
chown "$SERVICE_USER:$SERVICE_GROUP" "$target_dir"
chmod 770 "$target_dir"
chmod g+s "$target_dir"
```

**Changes**:
- Ensures groups exist before using them
- Creates parent directories recursively
- Sets correct ownership and permissions immediately

#### setup-deployment-users.sh (User Management Script)

**Already had proper implementation**:
- `ensure_groups()` creates webadmins and deployers groups
- `init_directories()` sets 775 permissions with setgid
- Already called by lightsail-setup.sh (now moved earlier)

**Changes**:
- No changes needed (already correct)

### 3. Permission Precedence

The scripts now follow this permission hierarchy:

1. **First**: Create groups (via setup-deployment-users.sh)
2. **Second**: Create parent directories with proper perms
3. **Third**: Clone/fetch code
4. **Fourth**: Fix ownership after clone (important!)
5. **Fifth**: Run operations as www-data (not root)

### 4. npm Cache Handling

Added explicit cache permission fix before npm operations:

```bash
# Fix npm cache permissions (can be created by root on first run)
sudo chown -R www-data:webadmins /var/www/.npm 2>/dev/null || true
```

This handles the case where:
- A previous deployment created `/var/www/.npm` as root
- Current deployment tries to use it as www-data
- npm throws EACCES errors

## Deployment Flow (After Fixes)

```
1. User runs: lightsail-setup.sh
2. Creates groups: webadmins, deployers
3. Prepares /var/www with correct perms
4. Clones repo to /var/www/carc-app
5. Fixes ownership after clone
6. Calls setup-deployment-users.sh --init-directories
   - Re-confirms groups exist
   - Sets app directory to 775 with setgid
7. Fetches .env from SSM (creates parent dirs with perms)
8. Fixes npm cache permissions
9. Runs npm install as www-data
10. Runs npm run build as www-data
11. Initializes databases (creates parent dirs with perms)
12. Sets up systemd services
13. Configures nginx
14. Service ready to run
```

## Manual Fixes (If Needed)

If you encounter permission issues after partial deployment:

```bash
# Fix everything at once
sudo chown -R www-data:webadmins /var/www
sudo chmod -R 775 /var/www
sudo find /var/www -type d -exec chmod g+s {} +

# Fix npm cache specifically
sudo chown -R www-data:webadmins /var/www/.npm

# Ensure groups exist
sudo groupadd -f webadmins
sudo groupadd -f deployers

# Add users to groups
sudo usermod -a -G webadmins ubuntu
sudo usermod -a -G webadmins www-data
```

## Testing

After deployment, verify permissions:

```bash
# Check app directory
ls -ld /var/www/carc-app
# Expected: drwxrwsr-x www-data webadmins

# Check a file inside
ls -l /var/www/carc-app/package.json
# Expected: -rw-rw-r-- www-data webadmins

# Check npm cache
ls -ld /var/www/.npm
# Expected: drwxrwsr-x www-data webadmins (or similar)

# Verify groups
getent group webadmins
getent group deployers
```

## Related Documentation

- [MULTI_ADMIN_SETUP.md](./MULTI_ADMIN_SETUP.md) - Multi-admin user setup
- [NGINX_CONFIGURATION.md](./NGINX_CONFIGURATION.md) - Nginx reverse proxy setup
- [README.md](./README.md) - Main deployment documentation
