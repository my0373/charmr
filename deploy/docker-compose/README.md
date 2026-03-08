# Charmr — Docker Compose Production Deployment

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- Pre-built images available from GHCR (or loaded locally via `docker load`)

## Quick Start

1. Copy the example environment file and edit it:

```bash
cp .env.example .env
# Edit .env — at minimum set DJANGO_SECRET_KEY and CHARMR_ADMIN_PASSWORD
```

2. Start the stack:

```bash
docker compose -f docker-compose.prod.yml up -d
```

3. Open http://localhost:8080 and log in with username `admin` and the password you set.

## Loading Example Data

If you have a fixture file (e.g. `example_uk.yaml`):

```bash
docker compose -f docker-compose.prod.yml cp example_uk.yaml backend:/tmp/data.yaml
docker compose -f docker-compose.prod.yml exec backend python manage.py populate_data /tmp/data.yaml
```

## Stopping

```bash
docker compose -f docker-compose.prod.yml down
```

## Updating

Pull the latest images and restart:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Data

The SQLite database is stored in a Docker named volume (`charmr-db`). This persists across container restarts and image updates. Back it up regularly.
