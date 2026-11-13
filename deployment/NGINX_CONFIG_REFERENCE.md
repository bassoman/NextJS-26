# nginx Configuration Quick Reference

**Copy and paste these commands into your Lightsail server terminal to inspect nginx.**

---

## View Active Configuration

### See everything nginx is actually using:

```bash
sudo nginx -T | less
```

(Press `q` to exit, `Space` to scroll)

### See just the site configuration:

```bash
sudo cat /etc/nginx/sites-enabled/carc
```

### See if the site is enabled:

```bash
ls -la /etc/nginx/sites-enabled/ | grep carc
```

Should show a symlink pointing to `/etc/nginx/sites-available/carc`

---

## Test Configuration

```bash
sudo nginx -t
```

**If it says "successful"**, your config is valid.  
**If it shows an error**, read the error message and fix the file indicated.

---

## Check nginx is Running

```bash
sudo systemctl status nginx
```

**If "Active: active (running)"**, nginx is running.  
**If "Active: inactive"**, start it:
```bash
sudo systemctl start nginx
```

---

## Check Node.js App is Running

```bash
sudo systemctl status carc-app@prod
```

**If "Active: active (running)"**, app is running.  
**If not running**:
```bash
sudo systemctl start carc-app@prod
```

---

## Check What's Listening

### What ports has nginx listening on?

```bash
sudo netstat -tlnp | grep nginx
```

Should show:
```
tcp    0    0 0.0.0.0:80      0.0.0.0:*    LISTEN    1234/nginx
```

### What port is Node.js listening on?

```bash
sudo netstat -tlnp | grep node
```

Should show:
```
tcp    0    0 127.0.0.1:3000  0.0.0.0:*    LISTEN    5678/node
```

### Both together:

```bash
sudo netstat -tlnp
```

---

## Test Connectivity

### Can you reach the app directly?

```bash
curl -I http://127.0.0.1:3000
```

Should show `HTTP/1.1 200 OK`

### Can you reach nginx?

```bash
curl -I http://127.0.0.1
```

Should show `HTTP/1.1 200 OK`

### Both with verbose output:

```bash
echo "=== Direct to app ===" && curl -v http://127.0.0.1:3000 2>&1 | head -15
echo "=== Via nginx ===" && curl -v http://127.0.0.1 2>&1 | head -15
```

---

## Check Configuration Points To

### What port does nginx proxy to?

```bash
sudo grep -n "proxy_pass" /etc/nginx/sites-enabled/carc
```

**Should show**: `proxy_pass http://127.0.0.1:3000;`

If it shows a different port, that's your problem.

### What domain/server_name is configured?

```bash
sudo grep -n "server_name" /etc/nginx/sites-enabled/carc
```

### What location blocks are configured?

```bash
sudo grep -n "location" /etc/nginx/sites-enabled/carc
```

---

## View Error Logs

### Last 20 errors:

```bash
sudo tail -20 /var/log/nginx/error.log
```

### Last 50 errors (more detailed):

```bash
sudo tail -50 /var/log/nginx/error.log
```

### All errors since last restart:

```bash
sudo journalctl -u nginx --no-pager
```

### Specific error pattern:

```bash
sudo grep "502\|error\|refused" /var/log/nginx/error.log | tail -20
```

---

## View Access Logs

### Last 20 requests:

```bash
sudo tail -20 /var/log/nginx/access.log
```

### Last 50 requests:

```bash
sudo tail -50 /var/log/nginx/access.log
```

### Count requests:

```bash
sudo wc -l /var/log/nginx/access.log
```

### Show 502 errors only:

```bash
sudo grep "502" /var/log/nginx/access.log
```

---

## Watch Logs in Real-Time

### Watch errors as they happen:

```bash
sudo tail -f /var/log/nginx/error.log
```

(Press `Ctrl+C` to stop)

### Watch access log:

```bash
sudo tail -f /var/log/nginx/access.log
```

### Watch app logs:

```bash
journalctl -u carc-app@prod -f
```

---

## One-Command Diagnostic

Copy and paste this whole thing:

```bash
echo "=== nginx status ===" && \
sudo systemctl status nginx --no-pager | head -5 && \
echo "" && \
echo "=== app status ===" && \
sudo systemctl status carc-app@prod --no-pager | head -5 && \
echo "" && \
echo "=== nginx listening ===" && \
sudo netstat -tlnp | grep nginx && \
echo "" && \
echo "=== app listening ===" && \
sudo netstat -tlnp | grep node && \
echo "" && \
echo "=== nginx config valid ===" && \
sudo nginx -t && \
echo "" && \
echo "=== can reach app directly ===" && \
curl -s -I http://127.0.0.1:3000 | head -1 && \
echo "" && \
echo "=== can reach via nginx ===" && \
curl -s -I http://127.0.0.1 | head -1 && \
echo "" && \
echo "=== nginx recent errors ===" && \
sudo tail -5 /var/log/nginx/error.log
```

---

## Reload nginx (Safe)

After making config changes:

```bash
sudo nginx -t
```

If it says "successful":
```bash
sudo systemctl reload nginx
```

---

## Restart nginx (Brief Downtime)

If reload doesn't work:

```bash
sudo systemctl restart nginx
```

---

## Show Complete Configuration

### All configuration sections:

```bash
sudo nginx -T
```

### Just the HTTP section:

```bash
sudo nginx -T | grep -A 100 "^http {"
```

### Just enabled site configuration:

```bash
sudo nginx -T | sed -n '/^server {/,/^}/p'
```

---

## Find and Fix Problems

### "502 Bad Gateway"

1. Is app running?
   ```bash
   sudo systemctl status carc-app@prod
   ```

2. What port is it on?
   ```bash
   sudo netstat -tlnp | grep node
   ```

3. What port does nginx expect?
   ```bash
   sudo grep "proxy_pass" /etc/nginx/sites-enabled/carc
   ```

4. Do they match? If not, restart app or update nginx.

### "Connection refused"

1. Is nginx running?
   ```bash
   sudo systemctl status nginx
   ```

2. Is it listening on port 80?
   ```bash
   sudo netstat -tlnp | grep :80
   ```

3. Start it if needed:
   ```bash
   sudo systemctl start nginx
   ```

### "Address already in use"

Find what's using port 80:
```bash
sudo lsof -i :80
```

Kill it or stop conflicting service.

---

## Copy Configuration for Help

Need to share your config with someone? Redact secrets first:

```bash
sudo cat /etc/nginx/sites-enabled/carc | sed 's/example\.com/DOMAIN/g'
```

---

## Related Files

- Configuration: `/etc/nginx/sites-enabled/carc`
- Error log: `/var/log/nginx/error.log`
- Access log: `/var/log/nginx/access.log`
- WebSocket config: `/etc/nginx/conf.d/connection_upgrade.conf`
- App service: `/etc/systemd/system/carc-app@.service`
- App env file: `/var/www/carc-app/.env`
- App logs: `journalctl -u carc-app@prod`

---

## Still Stuck?

Collect this information and share:

```bash
{
  echo "=== System ===" && uname -a
  echo "=== nginx version ===" && nginx -v
  echo "=== nginx config test ===" && sudo nginx -t
  echo "=== nginx status ===" && sudo systemctl status nginx --no-pager
  echo "=== app status ===" && sudo systemctl status carc-app@prod --no-pager
  echo "=== listening ports ===" && sudo netstat -tlnp | grep -E 'nginx|node|:80|:3000'
  echo "=== nginx error log ===" && sudo tail -20 /var/log/nginx/error.log
  echo "=== app logs ===" && journalctl -u carc-app@prod -n 20
} 2>&1
```

Copy the output and share for debugging.
