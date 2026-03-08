# Charmr — Synology NAS Deployment

This guide covers deploying Charmr on a Synology NAS using Container Manager (Docker).

## Prerequisites

- Synology DSM 7.2+
- Container Manager package installed
- SSH access or a way to transfer files

## Option A: Using Pre-Built Images from GHCR

If your Synology has internet access:

1. Open Container Manager.
2. Go to **Registry** and search for `ghcr.io/my0373/charmr-backend` and `ghcr.io/my0373/charmr-frontend`. Download the `latest` tag for both.
3. Go to **Project** and create a new project.
4. Upload or paste the contents of `docker-compose.prod.yml` from the `deploy/docker-compose/` directory.
5. Set the environment variables in the Container Manager UI (or upload the `.env` file):
   - `CHARMR_ADMIN_PASSWORD` — your chosen admin password
   - `DJANGO_SECRET_KEY` — a random secret (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
   - `DJANGO_ALLOWED_HOSTS` — your Synology's hostname or IP (e.g. `192.168.1.6`)
   - `CSRF_TRUSTED_ORIGINS` — `http://192.168.1.6:8080` (adjust to match your setup)
6. Start the project.
7. Access Charmr at `http://<synology-ip>:8080`.

## Option B: Offline Deployment

If your Synology does not have internet access, use the `charmr.sh package` command on a machine that does:

```bash
./charmr.sh package
```

This builds production images and creates a tar bundle. Transfer the resulting files to the Synology:

```bash
scp charmr-deploy-*.tar.gz myork@192.168.1.6:/volume1/docker/charmr/
```

On the Synology (via SSH):

```bash
cd /volume1/docker/charmr
tar xzf charmr-deploy-*.tar.gz
docker load < charmr-backend.tar
docker load < charmr-frontend.tar
cp .env.example .env
# Edit .env
docker compose -f docker-compose.prod.yml up -d
```

## Architecture Notes

- **Backend** runs gunicorn on an internal network (no published ports).
- **Frontend** (nginx) serves the SPA and proxies `/api/` requests to the backend. Port `8080` is published.
- The SQLite database is stored in a Docker volume for persistence.

## Updating

Pull new images (Option A) or transfer new image tars (Option B), then:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Migrations run automatically on startup.
