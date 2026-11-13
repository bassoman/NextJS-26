# CARC Deployment - Quick Reference Card

## Initial Setup (Fresh Instance)

```bash
# 1. SSH and clone
ssh ubuntu@<static-ip>
git clone https://github.com/bassoman/NextJS-26.git && cd NextJS-26

# 2. Run setup (creates app at /var/www/carc-app)
DOMAIN=example.com EMAIL=admin@example.com bash deployment/scripts/lightsail-setup.sh

# 3. Add team members
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh \
  --user alice --password "pass1" --deployer --pubkey alice.pub \
  --user bob --password "pass2" --pubkey bob.pub
```

## User Roles

| Role | SSH | Code | Build | Restart | DB |
|------|-----|------|-------|---------|-----|
| **www-data** | ❌ | Read | ❌ | ❌ | RW |
| **webadmin** | ✅ | RW | ❌ | ❌ | R |
| **deployer** | ✅ | RW | ✅ | ✅ | RW |

## Deployer Workflow

```bash
ssh alice@example.com
cd /var/www/carc-app
git pull origin main
npm ci
npm run build
sudo systemctl restart carc-app@prod
curl -f http://127.0.0.1:3000/
```

## Common Commands

### Status & Logs
```bash
sudo systemctl status carc-app@prod
sudo journalctl -u carc-app@prod -f
```

### View Configuration
```bash
cat /var/www/carc-app/.env
ls -la /var/www/carc-app/
```

### Database Operations
```bash
sudo sqlite3 /var/carc/prod/data/carc.db ".tables"
sudo bash /var/www/carc-app/frontend/scripts/backup-sqlite.sh
```

### User Management
```bash
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh --help
id alice  # Check group membership
```

## Directory Structure

```
/var/www/carc-app/          ← App code (www-data:webadmins, 775)
/var/carc/prod/data/        ← Production DB (www-data:webadmins, 770)
/var/carc/sandbox/data/     ← Sandbox DB (www-data:webadmins, 770)
/etc/sudoers.d/carc-deployers ← Permissions (auto-generated)
```

## Troubleshooting

### "Permission Denied" on git pull
```bash
id alice  # Check if in webadmins group
sudo usermod -aG webadmins alice  # Add if missing
```

### "Permission Denied" on database
```bash
ls -ld /var/carc/prod/data/
sudo chmod g+s /var/carc/prod/data/  # Enable setgid
sudo chmod 770 /var/carc/prod/data/
```

### Service won't start
```bash
sudo journalctl -u carc-app@prod -n 50
sudo -u www-data cat /var/www/carc-app/.env | head
ls -l /var/www/carc-app/.env
```

### Password required for sudo (shouldn't happen)
```bash
id alice  # Check if in deployers group
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh --init-directories
visudo -c -f /etc/sudoers.d/carc-deployers  # Verify syntax
```

## Backup & Restore

### Create Manual Backup
```bash
sudo bash /var/www/carc-app/frontend/scripts/backup-sqlite.sh
ls -la /var/carc/prod/backups/
```

### Restore from Backup
```bash
sudo cp /var/carc/prod/backups/carc.db.YYYYMMDD.HHMMSS /var/carc/prod/data/carc.db
sudo chown www-data:webadmins /var/carc/prod/data/carc.db
sudo chmod 660 /var/carc/prod/data/carc.db
sudo systemctl restart carc-app@prod
```

## Environment Variables

Edit at `/var/www/carc-app/.env`:
- Changes to `NEXT_PUBLIC_*` require rebuild: `npm run build`
- Other changes take effect after restart: `sudo systemctl restart carc-app@prod`

```bash
nano /var/www/carc-app/.env  # Edit
npm ci && npm run build       # If NEXT_PUBLIC_* changed
sudo systemctl restart carc-app@prod
```

## Monitoring

### Check All Services
```bash
sudo systemctl status carc-app@prod
sudo systemctl list-timers carc-backup.timer
```

### Recent Changes
```bash
cd /var/www/carc-app
git log --oneline -10
git log -p -1  # Latest commit details
```

### Who Deployed What
```bash
sudo grep "alice" /var/log/auth.log | grep COMMAND
sudo journalctl -u carc-app@prod --since "1 hour ago"
```

## Rollback to Previous Version

```bash
cd /var/www/carc-app
git log --oneline -5
git revert HEAD  # or git reset --hard <commit>
npm ci
npm run build
sudo systemctl restart carc-app@prod
```

## Emergency: Restore from Backup Instance

```bash
# If current instance is broken:
# 1. Update DNS to point to old/backup instance
# 2. Verify service is working
# 3. Investigate issue on broken instance
# 4. Fix and re-test
# 5. Switch DNS back to fixed instance
```

## Documentation Links

- **Full Setup**: `deployment/setup.md`
- **Operations Guide**: `deployment/MULTI_ADMIN_SETUP.md`
- **Implementation Details**: `DEPLOYMENT_MODERNIZATION.md`
- **Sudoers Template**: `deployment/sudoers-carc-deployers.template`

---

**Last Updated**: November 13, 2026  
**Version**: 2.0 (Multi-Admin Architecture)
