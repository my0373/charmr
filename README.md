# Charmr

## What is Charmr?

Charmr is a free, source-available platform built to help charities of all sizes run their organisations more effectively. It handles member management, regional event coordination, and the day-to-day admin that charity organisers currently juggle across spreadsheets, email threads, and paper forms.

## What does it do?

- **Member and family management** — track family memberships containing participants, carers, volunteers, and spectators. Each person has their own profile and participation types, with strong PII protections throughout.
- **Event coordination** — create and manage events at regional and national level, track registrations, and publish public event listings.
- **Fine-grained permissions** — users, groups, roles, and object-level permissions with regional scoping. An organiser in one region sees exactly what they need and nothing more.
- **Public-facing content** — provide a public window into the charity (about, upcoming events, contact) without requiring a login.
- **Complete REST API** — every feature is accessible through a token-authenticated API, making Charmr extendable and integrable with other tools.
- **Data export and import** — export all platform data to YAML for backup, migration, or version-controlled configuration. Import data from YAML to seed a new instance.

## Why was it created?

Many charities do vital work with limited resources. Off-the-shelf software is often too expensive, too generic, or doesn't take the security of member data seriously enough. Charmr was created to give these organisations a free tool that is purpose-built for their needs — secure by default, easy to use on any device, and designed to be run by volunteers, not IT departments.

## Tech Stack

| Layer          | Technology                                      |
|----------------|--------------------------------------------------|
| **Frontend**   | React, Vite, TypeScript, React Router            |
| **Backend**    | Django, Django REST Framework, Python             |
| **Database**   | SQLite (development) / PostgreSQL (production)    |
| **Containers** | Docker Compose, Red Hat UBI base images           |

### Why these choices?

- **Django + DRF** — mature security model (CSRF, XSS, SQL-injection protection built in), batteries-included ORM, and a browsable REST API.
- **React + Vite + TypeScript** — client-rendered SPA for responsive performance across devices; large ecosystem and contributor pool; type safety when working with sensitive data models.
- **Red Hat UBI** — hardened, minimal, freely redistributable container images for maximum security posture from day one.

## Project Structure

```
charmr/
├── backend/
│   ├── Dockerfile                  # UBI 9 Python 3.11 (development)
│   ├── Dockerfile.prod             # Production image (gunicorn)
│   ├── requirements.txt
│   └── charmr_backend/
│       ├── manage.py
│       ├── charmr/                 # Django project (settings, urls, wsgi)
│       ├── core/                   # Domain models (families, people, roles, etc.)
│       └── api/                    # DRF views, serializers, permissions
├── frontend/
│   ├── Dockerfile                  # UBI 9 Node.js 22 (development)
│   ├── Dockerfile.prod             # Production image (nginx + built SPA)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/                        # React + TypeScript source
├── deploy/                         # Deployment configurations
│   ├── docker-compose/             # Docker Compose production deployment
│   └── synology/                   # Synology NAS deployment guide
├── fixtures/                       # Example data files (YAML)
├── docs/                           # Project documentation
├── .github/workflows/              # CI/CD pipelines
├── docker-compose.yml              # Local development
├── charmr.sh                       # Management script
└── LICENSE                         # Charity First Licence (CFL) v1.0
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Quick start (development)

```bash
git clone https://github.com/my0373/charmr.git
cd charmr
./charmr.sh start --admin-password yourpassword
```

Once running, open:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/health/

Log in with username `admin` and the password you set.

### Load example data

Charmr ships with an example UK regions fixture. To load it:

```bash
./charmr.sh populate fixtures/example_uk.yaml
```

### Production deployment

See the [deploy/](deploy/) directory for deployment guides:
- **Docker Compose** — pull pre-built images from GHCR and run with a single compose file
- **Synology NAS** — deploy via Container Manager

### Management commands

| Command | Description |
|---------|-------------|
| `./charmr.sh start [--admin-password <pw>]` | Build and start all containers |
| `./charmr.sh stop` | Stop all containers |
| `./charmr.sh restart` | Stop and restart all containers |
| `./charmr.sh logs` | Follow log output |
| `./charmr.sh status` | Show container and service health |
| `./charmr.sh test` | Run the full test suite |
| `./charmr.sh export [file]` | Export all data to YAML |
| `./charmr.sh populate <file>` | Import data from YAML |
| `./charmr.sh package` | Build production images and create a deploy bundle |
| `./charmr.sh wipe` | Stop containers and delete all data |
| `./charmr.sh backup` | Back up the database to `./backups/` |
| `./charmr.sh restore <file>` | Restore a database backup |

## Branching Model

- **`main`** — protected, production-ready. Updated only via pull request from `devel`. Merges trigger image builds pushed to GHCR.
- **`devel`** — active development. Feature branches merge here via PR.
- **Feature branches** — branch off `devel`, merge back via PR.

All branches and PRs run the test suite automatically via GitHub Actions.

## Security

Charmr is designed to hold personally identifiable information (PII) and takes security seriously:

- Fine-grained permissions model: users, groups, roles, and object-level permissions scoped to regions
- Deny-by-default, least-privilege access control enforced at the API layer
- Non-root container processes on hardened Red Hat UBI base images
- OWASP Top 10 awareness baked into development practices

If you discover a security vulnerability, please report it responsibly by emailing the maintainers rather than opening a public issue.

## Contributing

Charmr is source-available under the [Charity First Licence](LICENSE). Contributions are welcome.

1. Fork the repository
2. Create a feature branch from `devel` (`git checkout -b feature/your-feature devel`)
3. Commit your changes with clear, descriptive messages
4. Open a pull request against `devel`

Please keep pull requests focused — one feature or fix per PR. All contributions must respect the security-first principles of the project.

## Licence

This project is licensed under the **Charity First Licence (CFL) v1.0**. See [LICENSE](LICENSE) for the full text and [docs/LICENSING.md](docs/LICENSING.md) for the rationale behind this choice.

In short: charities, non-profits, community groups, educational institutions, academic researchers, and individuals can use, modify, and deploy Charmr freely — including having a third party host it on their behalf. Commercial companies that want to offer Charmr as a hosted service or product need a separate commercial licence. See the [licence file](LICENSE) for details, or get in touch if you have questions.
