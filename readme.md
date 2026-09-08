# CARC Website

This is the baseline configuration for the CARC website.

## Installing Docker Compose

Docker Compose is required for running containerized services locally. If you are using Docker Desktop on macOS or Windows, Compose is bundled with Docker and is available as `docker compose`.

On Linux, install Docker Engine first, then install Compose:

```bash
sudo apt-get update
sudo apt-get install -y docker-compose-plugin
```

If you need the standalone `docker-compose` binary instead, install it with:

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Verify the installation:

```bash
docker compose version
# or
docker-compose version
```

If the command prints a version number, Docker Compose is installed correctly.
