# Manual Permission Fixes Reference

## What You Just Did

You ran manual commands to fix permissions when the automated scripts weren't applied yet. These are the exact steps that the updated scripts now do automatically.

## Commands Run (Documented)

### 1. Group Creation
```bash
sudo groupadd -f webadmins
sudo groupadd -f deployers
sudo usermod -a -G webadmins,deployers ubuntu
sudo usermod -a -G webadmins www-data
```

**What it does**: Creates the multi-admin groups and adds users to them.

### 2. Directory Ownership Fix
```bash
sudo chown -R www-data:webadmins /var/www
sudo chmod -R 775 /var/www
```

**What it does**: Makes www-data the owner, webadmins the group, with read/write for both.

### 3. npm Cache Fix
```bash
sudo chown -R 33:33 "/var/www/.npm"
```

**What it does**: Fixes npm cache ownership (33 is www-data's UID).

### 4. Clean Corrupted Lockfile
```bash
sudo rm -rf /var/www/carc-app/node_modules /var/www/carc-app/package-lock.json
```

**What it does**: Removes corrupted cache so fresh `npm install` works.

### 5. Install Dependencies
```bash
cd /var/www/carc-app
sudo -u www-data npm install
sudo -u www-data npm run build
```

**What it does**: Installs dependencies as www-data (service user).

## Why Each Step Was Needed

| Step | Problem | Solution |
|------|---------|----------|
| Groups | Groups didn't exist | Create webadmins and deployers |
| Ownership | /var/www was root:root | Change to www-data:webadmins |
| Permissions | /var/www was 755 (no group write) | Change to 775 (group can write) |
| npm cache | Root-owned cache blocked www-data | Chown to www-data |
| Lockfile | Corrupted by permission changes | Delete and regenerate |
| Build as www-data | Owner mismatch causes EACCES | Run npm as service user |

## Automated Approach (Going Forward)

The updated scripts now do all of this automatically:

```bash
# Just run the one command:
DOMAIN=example.com EMAIL=admin@example.com bash deployment/scripts/lightsail-setup.sh
```

The script handles:
✅ Group creation
✅ Directory creation with correct ownership
✅ Permission fixes (775 + setgid)
✅ npm cache fixes
✅ Building as www-data
✅ All parent directories created with perms

## Next Time Deployment Fails

If you encounter permission issues in future deployments:

1. **Check deployment logs**:
   ```bash
   sudo journalctl -u carc-app@prod -n 50
   ```

2. **If it's EACCES errors**:
   ```bash
   # Run the quick fix
   sudo chown -R www-data:webadmins /var/www
   sudo chmod -R 775 /var/www
   sudo find /var/www -type d -exec chmod g+s {} +
   sudo chown -R www-data:webadmins /var/www/.npm
   ```

3. **Then restart**:
   ```bash
   sudo systemctl restart carc-app@prod
   ```

## Prevention Going Forward

The automated scripts now include these fixes, so you won't need manual intervention unless:

- You modify directory permissions manually
- A script encounters an unexpected error
- You update the app in a way that changes ownership

In those cases, refer to this guide or [PERMISSION_FIXES.md](./PERMISSION_FIXES.md) for the detailed explanation.

## Files Changed

All deployment scripts have been updated to handle permissions automatically:

- **lightsail-setup.sh** - Main orchestration (most changes)
- **setup-deployment-users.sh** - User/group management (no changes, already correct)
- **initialize-databases.sh** - Database creation
- **fetch-ssm-params.sh** - Environment setup

See the commit message for complete details of what changed.
