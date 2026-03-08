# Charmr — Project Brief

## Vision

Charmr is a free, source-available platform that helps charities manage their members, coordinate regional events, and run their organisations more effectively.

The goal is to provide a secure, easy-to-use tool that charity organisers can rely on — without needing a large IT budget or specialist technical knowledge to operate.

## Target Users

### System users vs family members

A **system user** (someone with a login) and a **person** in the family/membership model are related but separate concepts. Not every person in a family will have a login, but any of them could.

A parent might log in to manage the family's membership and see their child's event schedule. A teenager might have their own login to check what they've been volunteered for. A participant might log in to view their upcoming events. The platform should not assume that only one person per family needs access.

```
Family
 ├── Person A (participant, age 12)      ── no system login (minor)
 ├── Person B (parent / carer)           ── system user (manages family)
 ├── Person C (parent / volunteer)       ── system user (views own volunteer schedule)
 └── Person D (sibling / spectator)      ── no system login
```

When a system user is linked to a person record, they automatically gain visibility of their own participation — events they're registered for, roles they've been assigned, volunteering commitments, and so on. A family contact can additionally see and manage records for other people in their family (subject to permissions).

### Roles

| Role                     | Description                                                                 |
|--------------------------|-----------------------------------------------------------------------------|
| **System Administrator** | Manages the platform itself — user accounts, configuration, API tokens.     |
| **Charity Administrator**| Oversees the charity's use of the platform — member data, reporting.         |
| **Regional Organiser**   | Manages events and members within a specific region.                        |
| **Family Contact**       | Manages their family's membership, can view and update records for people in their family. |
| **Family Member**        | A person in a family with their own login — can view their own profile, event registrations, and volunteer assignments. |
| **Public Visitor**       | An unauthenticated user who can view public-facing content (about, events). |

## Feature Areas

These are high-level feature areas, not a detailed specification. Each will be refined before implementation.

### Members, Families and Participation

Membership in a charity is not limited to a single individual. A single membership often represents a **family unit** — a person who participates in activities, alongside family members who attend events as spectators, volunteers, carers, or in other supporting roles. The data model must reflect this from the start.

#### Key concepts

| Concept              | Description                                                                                   |
|----------------------|-----------------------------------------------------------------------------------------------|
| **Family / Household** | The top-level membership unit. A family has one membership record and may contain multiple people. |
| **Person**           | An individual within a family. Every person has their own profile and PII.                     |
| **Participation type** | How a person engages with the charity: participant, spectator, volunteer, carer, etc. A person may have more than one participation type. |
| **Membership status** | Active, lapsed, pending renewal, etc. — tracked at the family level.                          |

#### Relationships

```
Family ──┬── Person (participant)
         ├── Person (parent / carer)
         ├── Person (sibling / spectator)
         └── Person (volunteer)
```

- A **family** groups related people under a single membership.
- Each **person** has their own profile (name, contact details, accessibility needs, etc.) and their own participation type(s).
- A person who is a participant at one event might volunteer at another — participation types are not fixed.
- PII protections apply to every person record, regardless of participation type.

#### Feature summary
- Register and manage family memberships containing one or more people
- Track each person's participation types and event involvement
- Store and protect PII for every individual
- Support for membership status, categories, and renewals at the family level
- Any family member with a login can view their own profile, event registrations, and volunteer assignments
- A family contact can manage the family's membership and records for all people in the family
- People without a login (e.g. young children) have their records managed by the family contact

### Event Management
- Create and manage events at regional and national level
- Associate events with regions and organisers
- Public event listings for unauthenticated visitors
- Event registration and attendance tracking (per person, with participation type)
- Support for different event roles: participant, volunteer, spectator, official, carer

### Users, Groups, Roles and Permissions

A solid permissions model is critical to Charmr. The system must support fine-grained, context-aware access control from day one — it cannot be bolted on later.

#### Core concepts

| Concept        | Description                                                                                      |
|----------------|--------------------------------------------------------------------------------------------------|
| **User**       | An authenticated individual with a unique account. Every action in the system is tied to a user.  |
| **Group**      | A named collection of users (e.g. "Regional Organisers", "Board Members"). Users can belong to multiple groups. |
| **Role**       | A named set of permissions that can be assigned to a user or group. Roles define *what* a user can do. |
| **Permission** | A single, granular capability (e.g. `members.view`, `events.edit`, `reports.export`). Permissions are assigned to roles, not directly to users. |
| **Scope**      | The context in which a role applies. A user might be an organiser in one region but only a member in another. |

#### How they relate

```
User ──┬── belongs to ──▶ Group(s)
       │
       ├── assigned ──▶ Role(s) ──▶ Permission(s)
       │                     │
       │                     └── scoped to ──▶ Region / Organisation / Global
       │
       └── linked to ──▶ Person (in a Family)
                              │
                              └── participation types, event registrations, volunteer assignments
```

- A **user** (system login) is linked to a **person** record in the family/membership model. This link determines what personal data and event information they can see.
- A **user** is assigned one or more **roles**, each optionally scoped to a **region** or the whole organisation.
- A **group** can also be assigned roles, and every member of that group inherits them.
- When a user acts on a resource, the system checks whether any of their roles (direct or via group membership) grant the required **permission** in the relevant **scope**.

#### Example roles

| Role                     | Typical permissions                                                        | Scope        |
|--------------------------|----------------------------------------------------------------------------|--------------|
| **System Admin**         | Full access to all resources, user management, configuration               | Global       |
| **Charity Admin**        | Member data, reporting, event oversight, group management                  | Global       |
| **Regional Organiser**   | Create/edit events, view/edit regional members, attendance tracking        | Region       |
| **Family Contact**       | View/edit own profile, manage family membership, view/edit family members' profiles | Own family |
| **Family Member**        | View/edit own profile, view own event registrations and volunteer assignments | Own data     |
| **API Consumer**         | Scoped access determined by the token's associated role                     | Varies       |

#### Design principles

- **Deny by default** — if no role explicitly grants a permission, access is denied.
- **Least privilege** — roles should carry only the permissions needed, nothing more.
- **Object-level permissions** — not just "can this user edit members?" but "can this user edit *this* member in *this* region?".
- **Separation of authentication and authorisation** — authentication confirms who you are; authorisation (the permissions model) determines what you can do. These are distinct subsystems.
- **Auditable** — every permission check on sensitive data should be loggable for compliance and debugging.
- **Extensible** — new roles and permissions can be added without code changes (data-driven, not hard-coded).

#### Implementation notes (Django)

Django's built-in `auth` framework provides `User`, `Group`, and `Permission` models. This gives us a strong foundation, but we will need to extend it:

- **Scoped role assignments** — Django's default permissions are global. We need a model that ties a role assignment to a scope (e.g. a region). This is likely a custom `RoleAssignment` model: `(user, role, scope)`.
- **Object-level permissions** — Django's default permission checks are model-level. For row-level checks ("can this user edit this specific member?"), we will use a library like `django-guardian` or build a lightweight object-permission layer on top of DRF's permission classes.
- **Permission checking in the API** — DRF permission classes will enforce access control at every endpoint. No view should rely solely on frontend route guards.
- **Admin-manageable** — roles and their permissions should be configurable through the admin interface or a dedicated management UI, not hard-coded in Python.

### Public-Facing Content
- About the charity
- Upcoming events calendar
- Contact information
- Accessible without login

### REST API
- Complete API covering all platform functionality
- Token-based authentication for programmatic access
- API tokens manageable by administrators
- Versioned endpoints to support future evolution

## Security Principles

Charmr will hold PII and must treat security as a first-class concern, not an afterthought.

| Principle                    | Approach                                                              |
|------------------------------|-----------------------------------------------------------------------|
| **Authentication**           | Token-based API auth; session auth for the web UI; MFA as a future goal |
| **Authorisation**            | Role-based access control enforced at the API layer                   |
| **PII Protection**           | Encryption at rest for sensitive fields; minimal data collection      |
| **Audit Logging**            | Log access to and modification of sensitive data                      |
| **Dependency Management**    | Automated scanning for known vulnerabilities in dependencies          |
| **OWASP Top 10**             | Development practices aligned with OWASP Top 10 mitigations          |
| **Responsible Disclosure**   | Security issues reported privately, not via public issue tracker      |
| **Container Hardening**      | Red Hat UBI base images; non-root container processes; minimal attack surface |

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                      │
│  ┌──────────────────┐    ┌────────────────────────┐  │
│  │  UBI: Node        │    │  UBI: Python            │  │
│  │                    │    │                          │  │
│  │  React SPA        │    │  Django + DRF            │  │
│  │  (Vite, TS)       │────│  REST API                │  │
│  │                    │    │  Token Auth / RBAC       │  │
│  │  React Router      │    │  ORM + Migrations        │  │
│  │                    │    │                          │  │
│  └──────────────────┘    │  ┌──────────────────┐    │  │
│                           │  │ SQLite / Postgres │    │  │
│                           │  └──────────────────┘    │  │
│                           └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

- The **frontend** is a client-rendered React SPA served from a Node container. It communicates with the backend exclusively via the REST API.
- The **backend** is a Django application using Django REST Framework. It handles authentication, authorisation, business logic, and data access.
- The **database** starts as SQLite for simplicity and migrates to PostgreSQL for production.
- Both containers use **Red Hat UBI** base images for a hardened, security-focused runtime.

## Technology Decisions

| Decision                        | Choice                          | Rationale                                                        |
|---------------------------------|---------------------------------|------------------------------------------------------------------|
| Backend framework               | Django + DRF                    | Mature security model, ORM, migrations, admin, large community   |
| Frontend framework              | React + Vite + TypeScript       | Performance, ecosystem size, type safety for PII models          |
| Routing                         | React Router                    | Industry standard for React SPAs                                 |
| Database (dev)                  | SQLite                          | Zero-config, file-based, perfect for local development           |
| Database (prod)                 | PostgreSQL                      | Robust, scalable, well-supported by Django                       |
| Containers                      | Docker Compose + Red Hat UBI    | Reproducible environments; hardened, minimal base images         |
| API authentication              | Session (dev) / Token (prod)    | Simple session for development; tokens for programmatic access   |
| Licence                         | Charity First Licence (CFL) v1.0 | Free for charities and academia; prevents commercial SaaS exploitation |

## Phased Roadmap

This is a rough sequencing of work, not a timeline. Each phase should result in something usable and demonstrable.

### Phase 1 — Foundation and Authentication
- Project scaffolding (Django project, React app, Docker Compose)
- Red Hat UBI Dockerfiles for both containers
- Django user model with role-based permissions
- Session-based authentication
- React app shell with routing and auth flow (login, logout, protected routes)
- Basic CI (linting, tests)

### Phase 2 — Members and Events
- Member model with PII field protections
- CRUD API for members (scoped by role and region)
- Event model with regional associations
- CRUD API for events
- Frontend views for member and event management
- Audit logging for sensitive data access

### Phase 3 — Public Site and API Tokens
- Public-facing pages (about, events calendar, contact)
- API token management for administrators
- Responsive design polish across devices
- Accessibility review

### Phase 4 — Production Hardening
- PostgreSQL migration and configuration
- PII encryption at rest
- Automated dependency vulnerability scanning
- Performance profiling and optimisation
- Deployment documentation

## Open Questions

These are things that will need answering as the project progresses:

- What specific PII fields are required for each person? (name, DOB, address, medical/accessibility info, etc.)
- Is membership/payment tracked per family or can individuals hold standalone memberships too?
- What participation types exist beyond participant, volunteer, spectator, and carer?
- Are there membership fees or financial tracking requirements?
- What reporting or data export capabilities do organisers need?
- Is email notification required (event reminders, membership renewals)?
- What are the data retention and GDPR compliance requirements?
- Should the platform support multiple charities, or is it single-tenant?
