# Branching Model and Branch Protection

## Branches

| Branch | Purpose | Merges from | Deploys |
|--------|---------|-------------|---------|
| `main` | Production-ready releases | `devel` via PR only | GHCR image build + push |
| `devel` | Active development integration | Feature branches via PR | CI tests only |
| `feature/*` | Individual features and fixes | — | CI tests only |

## Workflow

1. Create a feature branch from `devel`:
   ```bash
   git checkout devel
   git pull
   git checkout -b feature/my-feature
   ```

2. Develop, commit, push:
   ```bash
   git push -u origin feature/my-feature
   ```

3. Open a Pull Request targeting `devel`. CI tests run automatically.

4. After review and CI pass, merge into `devel`.

5. When `devel` is ready for release, open a PR from `devel` to `main`. After merge, the release workflow builds and pushes images to GHCR.

## Branch Protection Rules (GitHub Settings)

### `main` branch

Navigate to **Settings > Branches > Add rule** for `main`:

- Require a pull request before merging
  - Require approvals: 1 (adjust as team grows)
  - Dismiss stale pull request approvals when new commits are pushed
- Require status checks to pass before merging
  - Required checks: `Backend Tests`, `Frontend Build`, `Docker Build Check`
- Require branches to be up to date before merging
- Do not allow force pushes
- Do not allow deletions

### `devel` branch

Navigate to **Settings > Branches > Add rule** for `devel`:

- Require status checks to pass before merging
  - Required checks: `Backend Tests`, `Frontend Build`
- Do not allow force pushes

## Setting Up

After pushing the repository to GitHub:

```bash
# Ensure you're on main with all changes committed
git checkout main

# Create and push the devel branch
git checkout -b devel
git push -u origin devel

# Switch back to devel for development
git checkout devel
```

Then configure branch protection rules in the GitHub repository settings as described above.
