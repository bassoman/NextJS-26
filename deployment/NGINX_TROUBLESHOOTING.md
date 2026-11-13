# nginx Troubleshooting Guide

Quick diagnostic steps when nginx doesn't work or can't reach the app.

---

## Quick Diagnosis (Run These First)

### 1. Is nginx running?

```bash
sudo systemctl status nginx
```

Expected output:
```
● nginx.service - A high performance web server and a reverse proxy server
   Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
   Active: active (running) since ...
```

**If not running:**
```bash
sudo systemctl start nginx
sudo systemctl status nginx
```

### 2. Is the nginx configuration valid?

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If syntax error:**
- Check `/etc/nginx/sites-enabled/carc` for typos
- See "Common Configuration Errors" section below

### 3. Is Node.js app running?

```bash
sudo systemctl status carc-app@prod
```

Expected output:
```
● carc-app@prod.service - CARC Application (prod)
   Active: active (running) since ...
```

**If not running:**
```bash
sudo systemctl start carc-app@prod
sudo systemctl status carc-app@prod
```

### 4. Is Node.js listening on the right port?

```bash
sudo netstat -tlnp | grep -E '3000|node'
```

Expected output:
```
tcp  0  0 127.0.0.1:3000  0.0.0.0:*  LISTEN  12345/node
```

**If nothing appears:**
- App is not running (check step 3)
- App is listening on wrong port (check `/var/www/carc-app/.env`)
- App crashed during startup

### 5. Can you reach Node.js directly?

```bash
curl -I http://127.0.0.1:3000
```

Expected output:
```
HTTP/1.1 200 OK
content-type: text/html
```

**If connection refused:**
- Node.js isn't listening
- Node.js crashed
- Firewall blocking (unlikely on localhost)

### 6. Can you reach nginx?

```bash
curl -I http://127.0.0.1
```

Expected output:
```
HTTP/1.1 200 OK
```

**If connection refused:**
- nginx isn't listening on port 80
- nginx crashed

**If 502 Bad Gateway:**
- nginx can't reach Node.js
- See "502 Bad Gateway" section below

---

## View Full nginx Configuration

### See what nginx actually loaded:

```bash
sudo nginx -T
```

This shows **ALL** configuration that nginx is using, including:
- Main nginx.conf
- All included files
- All site configurations
- All upstream definitions

### See specific site configuration:

```bash
sudo cat /etc/nginx/sites-enabled/carc
```

### Check which sites are enabled:

```bash
ls -la /etc/nginx/sites-enabled/
```

Should show:
```
lrwxrwxrwx  1 root root   27 ... carc -> /etc/nginx/sites-available/carc
```

### Check available but disabled sites:

```bash
ls -la /etc/nginx/sites-available/
```

---

## Common Configuration Errors

### Error: "connect() failed (111: Connection refused)"

**Symptom**: nginx error log shows connection refused to 127.0.0.1:3000

**Check**:
1. Is Node.js running?
   ```bash
   sudo systemctl status carc-app@prod
   ```

2. What port is Node.js listening on?
   ```bash
   sudo netstat -tlnp | grep node
   ```

3. Is the nginx config pointing to the right port?
   ```bash
   sudo grep "proxy_pass" /etc/nginx/sites-enabled/carc
   ```
   Should show: `proxy_pass http://127.0.0.1:3000;`

**Fix**:
- Start the app: `sudo systemctl start carc-app@prod`
- Or update PORT in `/var/www/carc-app/.env` to match the port in nginx config

### Error: "502 Bad Gateway"

**Symptom**: Browser shows 502, curl shows bad gateway

**Check logs**:
```bash
sudo tail -50 /var/log/nginx/error.log
```

Look for patterns like:
- `connect() failed` → App not running
- `connection timed out` → App crashed or firewall issue
- `broken pipe` → App crashed mid-request

**Solutions**:

1. **App not running**:
   ```bash
   sudo systemctl start carc-app@prod
   sudo systemctl status carc-app@prod
   ```

2. **App crashed**:
   ```bash
   # Check what's wrong
   sudo systemctl status carc-app@prod
   # Check app logs
   journalctl -u carc-app@prod -n 50
   ```

3. **App on wrong port**:
   ```bash
   # Check nginx expects this port
   sudo grep "proxy_pass" /etc/nginx/sites-enabled/carc
   # Check app listening on this port
   sudo netstat -tlnp | grep node
   # If different, restart app or update nginx
   ```

### Error: "SSL certificate problem" or HTTPS doesn't work

```bash
# Check certificate is valid
sudo certbot certificates

# Check certificate expiration
sudo openssl x509 -in /etc/letsencrypt/live/example.com/fullchain.pem -text -noout | grep -A2 "Not After"

# Renew if expired
sudo certbot renew --force-renewal

# Reload nginx
sudo systemctl reload nginx
```

### Error: Domain points to wrong server

**Symptom**: curl works locally, but domain doesn't work or 403/404 errors

**Check**:
```bash
# Does DNS point to this server?
nslookup example.com
# Should show your Lightsail public IP

# Can you reach this IP?
curl -I http://<your-lightsail-ip>
```

**Fix**: Update DNS records to point to Lightsail public IP

---

## 502 Bad Gateway Troubleshooting Flow

```
Browser request → nginx (port 80/443)
                    ↓
                Reverse proxy to 127.0.0.1:3000
                    ↓
                Node.js app
```

If you see **502 Bad Gateway**:

### Step 1: Is nginx running?
```bash
sudo systemctl status nginx
# Should show: Active: active (running)
```

### Step 2: Is nginx config valid?
```bash
sudo nginx -t
# Should show: test is successful
```

### Step 3: Is Node.js app running?
```bash
sudo systemctl status carc-app@prod
# Should show: Active: active (running)
```

### Step 4: Is Node.js listening on port 3000?
```bash
sudo netstat -tlnp | grep 3000
# Should show: tcp 0 0 127.0.0.1:3000 0.0.0.0:* LISTEN
```

### Step 5: Can you reach Node.js directly?
```bash
curl http://127.0.0.1:3000
# Should get 200 OK
```

### Step 6: Check nginx error log
```bash
sudo tail -50 /var/log/nginx/error.log
# Look for: connect() failed, connection timed out, etc.
```

### Step 7: Restart services
```bash
# Restart app
sudo systemctl restart carc-app@prod

# Reload nginx (no downtime)
sudo systemctl reload nginx

# Test again
curl http://127.0.0.1
```

---

## Understanding the Configuration

### Where is the nginx configuration?

```
/etc/nginx/
├── nginx.conf                    # Main config
├── sites-available/
│   └── carc                      # Site definition (NOT active yet)
├── sites-enabled/
│   └── carc → ../sites-available/carc  # Symlink (active)
└── conf.d/
    └── connection_upgrade.conf   # WebSocket support
```

### How does nginx load the configuration?

1. **Main config** (`/etc/nginx/nginx.conf`):
   ```nginx
   http {
       include /etc/nginx/sites-enabled/*;  # Loads all enabled sites
       include /etc/nginx/conf.d/*.conf;    # Loads additional configs
   }
   ```

2. **Site config** (`/etc/nginx/sites-enabled/carc`):
   ```nginx
   server {
       listen 80;
       server_name example.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
       }
   }
   ```

3. **WebSocket support** (`/etc/nginx/conf.d/connection_upgrade.conf`):
   ```nginx
   map $http_upgrade $connection_upgrade {
       default upgrade;
       ''      close;
   }
   ```

---

## Viewing Logs in Real-Time

### Watch nginx errors as they happen:

```bash
sudo tail -f /var/log/nginx/error.log
```

Press `Ctrl+C` to stop.

### Watch nginx access log:

```bash
sudo tail -f /var/log/nginx/access.log
```

### Watch app logs:

```bash
journalctl -u carc-app@prod -f
```

### Watch everything together (in three terminals):

Terminal 1:
```bash
sudo tail -f /var/log/nginx/error.log
```

Terminal 2:
```bash
sudo tail -f /var/log/nginx/access.log
```

Terminal 3:
```bash
journalctl -u carc-app@prod -f
```

Then make requests: `curl http://127.0.0.1` and watch logs update.

---

## Test nginx Configuration Changes

After modifying nginx config:

```bash
# 1. Test syntax
sudo nginx -t

# 2. If OK, reload (no downtime)
sudo systemctl reload nginx

# 3. Verify running
sudo systemctl status nginx

# 4. Test connectivity
curl http://127.0.0.1
```

---

## Restart vs Reload

| Command | Effect | Downtime |
|---------|--------|----------|
| `systemctl start nginx` | Start nginx if stopped | None (starts from stop) |
| `systemctl stop nginx` | Stop nginx | Total (stops serving) |
| `systemctl restart nginx` | Stop then start | Brief (usually <1s) |
| `systemctl reload nginx` | Graceful reload | None (no dropped requests) |

**Use `reload` for config changes (preferred), `restart` if something stuck.**

---

## Port Forwarding Issues

### Check what's listening on each port:

```bash
# Port 80 (HTTP)
sudo netstat -tlnp | grep :80

# Port 443 (HTTPS, if configured)
sudo netstat -tlnp | grep :443

# Port 3000 (Node.js)
sudo netstat -tlnp | grep :3000
```

Expected:
```
Port 80:   nginx
Port 443:  nginx (if HTTPS enabled)
Port 3000: node (localhost only)
```

---

## Debugging with curl

### Test connection with detailed output:

```bash
curl -v http://127.0.0.1
```

Output shows:
- Connection attempts
- HTTP headers sent/received
- Redirects
- Response body

### Test with custom headers:

```bash
curl -H "Host: example.com" http://127.0.0.1
```

### Test HTTPS:

```bash
curl -v https://example.com
```

Add `-k` to ignore certificate warnings:
```bash
curl -k https://example.com
```

### Test WebSocket upgrade:

```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG8gd29ybGQ=" \
  http://127.0.0.1/
```

Should see `101 Switching Protocols` if app supports WebSocket.

---

## Quick One-Liners

Check everything at once:

```bash
# Status summary
echo "=== nginx ===" && sudo systemctl status nginx --no-pager && \
echo "=== app ===" && sudo systemctl status carc-app@prod --no-pager && \
echo "=== app listening ===" && sudo netstat -tlnp | grep 3000 && \
echo "=== nginx listening ===" && sudo netstat -tlnp | grep :80 && \
echo "=== direct app ===" && curl -s -I http://127.0.0.1:3000 && \
echo "=== via nginx ===" && curl -s -I http://127.0.0.1
```

---

## Common Causes & Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| Connection refused | nginx not running | `sudo systemctl start nginx` |
| 502 Bad Gateway | App not running | `sudo systemctl start carc-app@prod` |
| 502 Bad Gateway | App on wrong port | Update `.env` or nginx config |
| nginx: [emerg] bind() to 0.0.0.0:80 | Port 80 in use | Find: `sudo lsof -i :80` then kill process |
| curl: (7) Failed to connect | Domain DNS wrong | Check: `nslookup example.com` |
| HTTPS certificate error | Cert expired | Renew: `sudo certbot renew --force-renewal` |
| Site not in sites-enabled | Symlink missing | Create: `sudo ln -s ../sites-available/carc /etc/nginx/sites-enabled/carc` |

---

## How to Fix Not Getting Through nginx

If you can connect to Node.js directly but not through nginx:

```bash
# 1. Verify nginx config is valid
sudo nginx -t

# 2. View the actual site configuration
sudo cat /etc/nginx/sites-enabled/carc

# 3. Check it's in sites-enabled
ls -la /etc/nginx/sites-enabled/ | grep carc

# 4. See all loaded configuration
sudo nginx -T | grep -A 20 "server {"

# 5. Reload nginx
sudo systemctl reload nginx

# 6. Test direct vs proxied
curl -v http://127.0.0.1:3000   # Should work
curl -v http://127.0.0.1        # Should proxy to above
curl -v http://example.com      # Should work (if DNS correct)

# 7. Check error log
sudo tail -50 /var/log/nginx/error.log
```

---

## When to Call for Help

Provide this information:

```bash
# Run this on the server and save output
{
  echo "=== nginx status ===" && sudo systemctl status nginx &&
  echo "=== app status ===" && sudo systemctl status carc-app@prod &&
  echo "=== nginx config test ===" && sudo nginx -t &&
  echo "=== listening ports ===" && sudo netstat -tlnp &&
  echo "=== nginx error log ===" && sudo tail -50 /var/log/nginx/error.log &&
  echo "=== app logs ===" && journalctl -u carc-app@prod -n 50
} > nginx_debug.txt

# Share nginx_debug.txt content
```

---

## Related Documentation

- [NGINX_CONFIGURATION.md](./NGINX_CONFIGURATION.md) - Complete setup guide
- [MULTI_ADMIN_SETUP.md](./MULTI_ADMIN_SETUP.md) - User and permission architecture
- [setup.md](./setup.md) - Quick start guide
