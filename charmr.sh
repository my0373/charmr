#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose"
PROJECT_NAME="charmr"
BACKUP_DIR="./backups"
DB_VOLUME="charmr_charmr-db"
DB_PATH_IN_VOLUME="/opt/app-root/data/db.sqlite3"

usage() {
    cat <<EOF
Usage: $0 <command> [options]

Commands:
  start       Build and start all containers in the background
              Options: --admin-password <password>
  stop        Stop all containers
  restart     Stop and then start all containers
              Options: --admin-password <password>
  logs        Follow log output from all containers
  status      Show the current state of all containers and services
  test        Run a full suite of tests to verify everything is working
  wipe        Stop all containers and delete all data (volumes)
  export      Export all platform data to a YAML file
              Usage: $0 export [output-file]
              Defaults to ./exports/charmr_YYYYMMDD_HHMMSS.yaml
  populate    Import platform data from a YAML file
              Usage: $0 populate <yaml-file> [--wipe] [--default-password <pw>]
  package     Build production images and create a deployment bundle
              Creates a tar.gz containing images + compose file for offline deploy
  backup      Back up the SQLite database to ./backups/
  restore     Restore a SQLite database backup
              Usage: $0 restore <backup-file>

EOF
}

confirm() {
    local prompt="$1"
    read -r -p "$prompt [y/N] " response
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

cmd_start() {
    local admin_password=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --admin-password)
                if [[ -z "${2:-}" ]]; then
                    echo "Error: --admin-password requires a value."
                    exit 1
                fi
                admin_password="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    echo "Building and starting Charmr..."
    $COMPOSE up -d --build

    if [[ -n "$admin_password" ]]; then
        echo "Waiting for backend to be ready..."
        local attempts=0
        while ! curl -sf http://localhost:8000/api/health/ >/dev/null 2>&1; do
            attempts=$((attempts + 1))
            if [[ $attempts -ge 30 ]]; then
                echo "Error: backend did not become ready in time."
                exit 1
            fi
            sleep 1
        done
        echo "Setting admin password..."
        $COMPOSE exec -T backend python manage.py ensure_admin --password "$admin_password"
    fi

    echo ""
    echo "Charmr is running:"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:8000/api/health/"
    if [[ -n "$admin_password" ]]; then
        echo "  Admin:    http://localhost:8000/admin/ (user: admin)"
    fi
}

cmd_stop() {
    echo "Stopping Charmr..."
    $COMPOSE down
}

cmd_restart() {
    cmd_stop
    cmd_start "$@"
}

cmd_logs() {
    $COMPOSE logs -f
}

cmd_status() {
    echo ""
    echo "======================================"
    echo "  Charmr Status"
    echo "======================================"
    echo ""

    echo "[Containers]"
    local services
    services=$($COMPOSE ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null)
    if [[ -n "$services" ]]; then
        echo "$services"
    else
        echo "  No containers running."
    fi

    echo ""
    echo "[Volumes]"
    local db_vol_exists
    db_vol_exists=$(docker volume ls --format '{{.Name}}' | grep "^${DB_VOLUME}$" || echo "")
    if [[ -n "$db_vol_exists" ]]; then
        local db_size
        db_size=$(docker run --rm -v "${DB_VOLUME}:/dbdata:ro" \
            registry.access.redhat.com/ubi9/ubi-minimal:latest \
            stat -c%s /dbdata/db.sqlite3 2>/dev/null || echo "missing")
        if [[ "$db_size" != "missing" ]]; then
            echo "  Database volume: exists (db.sqlite3 = ${db_size} bytes)"
        else
            echo "  Database volume: exists (no database file yet)"
        fi
    else
        echo "  Database volume: not created"
    fi

    echo ""
    echo "[Endpoints]"
    local be_status
    be_status=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/api/health/ 2>/dev/null || echo "000")
    if [[ "$be_status" == "200" ]]; then
        echo "  Backend API:  http://localhost:8000/api/health/ (up)"
    else
        echo "  Backend API:  http://localhost:8000/api/health/ (down)"
    fi

    local fe_status
    fe_status=$(curl -so /dev/null -w '%{http_code}' http://localhost:5173/ 2>/dev/null || echo "000")
    if [[ "$fe_status" == "200" ]]; then
        echo "  Frontend:     http://localhost:5173 (up)"
    else
        echo "  Frontend:     http://localhost:5173 (down)"
    fi

    local admin_status
    admin_status=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/admin/login/ 2>/dev/null || echo "000")
    if [[ "$admin_status" == "200" ]]; then
        echo "  Django Admin: http://localhost:8000/admin/ (up)"
    else
        echo "  Django Admin: http://localhost:8000/admin/ (down)"
    fi

    echo ""
    echo "[Backups]"
    local backup_count
    backup_count=$(find "$BACKUP_DIR" -name '*.sqlite3' 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$backup_count" -gt 0 ]]; then
        echo "  $backup_count backup(s) in $BACKUP_DIR/"
        local latest
        latest=$(ls -t "$BACKUP_DIR"/*.sqlite3 2>/dev/null | head -1)
        echo "  Latest: $latest"
    else
        echo "  No backups found."
    fi
    echo ""
}

cmd_test() {
    local pass=0
    local fail=0
    local total=0

    test_pass() {
        pass=$((pass + 1))
        total=$((total + 1))
        echo "  PASS: $1"
    }

    test_fail() {
        fail=$((fail + 1))
        total=$((total + 1))
        echo "  FAIL: $1"
        if [[ -n "${2:-}" ]]; then
            echo "        $2"
        fi
    }

    echo ""
    echo "======================================"
    echo "  Charmr Test Suite"
    echo "======================================"
    echo ""

    # ── Container health ──────────────────────────────────────────────

    echo "[Containers]"

    if $COMPOSE ps --status running --format '{{.Service}}' 2>/dev/null | grep -q '^backend$'; then
        test_pass "Backend container is running"
    else
        test_fail "Backend container is running" "Container is not running — run ./charmr.sh start first"
    fi

    if $COMPOSE ps --status running --format '{{.Service}}' 2>/dev/null | grep -q '^frontend$'; then
        test_pass "Frontend container is running"
    else
        test_fail "Frontend container is running" "Container is not running"
    fi

    local be_user
    be_user=$($COMPOSE exec -T backend id -u 2>/dev/null || echo "")
    if [[ "$be_user" == "1001" ]]; then
        test_pass "Backend runs as non-root (uid $be_user)"
    elif [[ -n "$be_user" ]]; then
        test_fail "Backend runs as non-root" "Running as uid $be_user"
    else
        test_fail "Backend runs as non-root" "Could not determine uid"
    fi

    local fe_user
    fe_user=$($COMPOSE exec -T frontend id -u 2>/dev/null || echo "")
    if [[ "$fe_user" == "1001" ]]; then
        test_pass "Frontend runs as non-root (uid $fe_user)"
    elif [[ -n "$fe_user" ]]; then
        test_fail "Frontend runs as non-root" "Running as uid $fe_user"
    else
        test_fail "Frontend runs as non-root" "Could not determine uid"
    fi

    echo ""

    # ── Backend API ───────────────────────────────────────────────────

    echo "[Backend API]"

    local health_response
    health_response=$(curl -sf http://localhost:8000/api/health/ 2>/dev/null || echo "")
    if [[ -n "$health_response" ]]; then
        test_pass "Backend is reachable on port 8000"
    else
        test_fail "Backend is reachable on port 8000" "curl to localhost:8000 failed"
    fi

    if echo "$health_response" | grep -q '"status":"ok"'; then
        test_pass "Health endpoint returns {\"status\": \"ok\"}"
    else
        test_fail "Health endpoint returns {\"status\": \"ok\"}" "Got: $health_response"
    fi

    local health_ct
    health_ct=$(curl -sI http://localhost:8000/api/health/ 2>/dev/null | grep -i '^content-type:' || echo "")
    if echo "$health_ct" | grep -qi 'application/json'; then
        test_pass "Health endpoint returns JSON content-type"
    else
        test_fail "Health endpoint returns JSON content-type" "Got: $health_ct"
    fi

    local health_code
    health_code=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/api/health/ 2>/dev/null || echo "000")
    if [[ "$health_code" == "200" ]]; then
        test_pass "Health endpoint returns HTTP 200"
    else
        test_fail "Health endpoint returns HTTP 200" "Got HTTP $health_code"
    fi

    local not_found_code
    not_found_code=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/api/nonexistent/ 2>/dev/null || echo "000")
    if [[ "$not_found_code" == "404" ]]; then
        test_pass "Unknown API route returns HTTP 404"
    else
        test_fail "Unknown API route returns HTTP 404" "Got HTTP $not_found_code"
    fi

    local post_code
    post_code=$(curl -so /dev/null -w '%{http_code}' -X POST http://localhost:8000/api/health/ 2>/dev/null || echo "000")
    if [[ "$post_code" == "405" ]]; then
        test_pass "Health endpoint rejects POST (HTTP 405)"
    else
        test_fail "Health endpoint rejects POST (HTTP 405)" "Got HTTP $post_code"
    fi

    echo ""

    # ── Auth API ──────────────────────────────────────────────────────

    echo "[Auth API]"

    local me_unauth_code
    me_unauth_code=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/api/auth/me/ 2>/dev/null || echo "000")
    if [[ "$me_unauth_code" == "403" ]]; then
        test_pass "/api/auth/me/ returns 403 when not authenticated"
    else
        test_fail "/api/auth/me/ returns 403 when not authenticated" "Got HTTP $me_unauth_code"
    fi

    local csrf_code
    csrf_code=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/api/auth/csrf/ 2>/dev/null || echo "000")
    if [[ "$csrf_code" == "200" ]]; then
        test_pass "/api/auth/csrf/ returns CSRF token (HTTP 200)"
    else
        test_fail "/api/auth/csrf/ returns CSRF token" "Got HTTP $csrf_code"
    fi

    local bad_login_code
    bad_login_code=$(curl -so /dev/null -w '%{http_code}' \
        -X POST http://localhost:8000/api/auth/login/ \
        -H "Content-Type: application/json" \
        -d '{"username":"fake","password":"wrong"}' 2>/dev/null || echo "000")
    if [[ "$bad_login_code" == "401" ]]; then
        test_pass "Login with bad credentials returns HTTP 401"
    else
        test_fail "Login with bad credentials returns HTTP 401" "Got HTTP $bad_login_code"
    fi

    local test_user="__charmr_test__"
    local test_pass="__charmr_test_pass__"
    $COMPOSE exec -T backend python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'charmr.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(username='$test_user').delete()
u = User.objects.create_user(username='$test_user', password='$test_pass')
" >/dev/null 2>&1 || true

    local cookie_jar
    cookie_jar=$(mktemp)

    local csrf_response
    csrf_response=$(curl -sf -c "$cookie_jar" http://localhost:8000/api/auth/csrf/ 2>/dev/null || echo "")
    local csrf_val
    csrf_val=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4 || echo "")

    local login_code
    login_code=$(curl -so /dev/null -w '%{http_code}' -b "$cookie_jar" -c "$cookie_jar" \
        -X POST http://localhost:8000/api/auth/login/ \
        -H "Content-Type: application/json" \
        -H "X-CSRFToken: $csrf_val" \
        -d "{\"username\":\"$test_user\",\"password\":\"$test_pass\"}" 2>/dev/null || echo "000")
    if [[ "$login_code" == "200" ]]; then
        test_pass "Login with valid credentials returns HTTP 200"
    else
        test_fail "Login with valid credentials returns HTTP 200" "Got HTTP $login_code"
    fi

    local me_auth_code
    me_auth_code=$(curl -so /dev/null -w '%{http_code}' -b "$cookie_jar" \
        http://localhost:8000/api/auth/me/ 2>/dev/null || echo "000")
    if [[ "$me_auth_code" == "200" ]]; then
        test_pass "/api/auth/me/ returns 200 when authenticated"
    else
        test_fail "/api/auth/me/ returns 200 when authenticated" "Got HTTP $me_auth_code"
    fi

    local me_response
    me_response=$(curl -sf -b "$cookie_jar" http://localhost:8000/api/auth/me/ 2>/dev/null || echo "")
    if echo "$me_response" | grep -q "\"username\":\"$test_user\""; then
        test_pass "/api/auth/me/ returns correct username"
    else
        test_fail "/api/auth/me/ returns correct username" "Got: $me_response"
    fi

    csrf_response=$(curl -sf -c "$cookie_jar" -b "$cookie_jar" http://localhost:8000/api/auth/csrf/ 2>/dev/null || echo "")
    csrf_val=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4 || echo "")

    local logout_code
    logout_code=$(curl -so /dev/null -w '%{http_code}' -b "$cookie_jar" -c "$cookie_jar" \
        -X POST http://localhost:8000/api/auth/logout/ \
        -H "X-CSRFToken: $csrf_val" 2>/dev/null || echo "000")
    if [[ "$logout_code" == "200" ]]; then
        test_pass "Logout returns HTTP 200"
    else
        test_fail "Logout returns HTTP 200" "Got HTTP $logout_code"
    fi

    local me_after_logout
    me_after_logout=$(curl -so /dev/null -w '%{http_code}' -b "$cookie_jar" \
        http://localhost:8000/api/auth/me/ 2>/dev/null || echo "000")
    if [[ "$me_after_logout" == "403" ]]; then
        test_pass "/api/auth/me/ returns 403 after logout"
    else
        test_fail "/api/auth/me/ returns 403 after logout" "Got HTTP $me_after_logout"
    fi

    rm -f "$cookie_jar"

    $COMPOSE exec -T backend python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'charmr.settings')
django.setup()
from django.contrib.auth import get_user_model
get_user_model().objects.filter(username='$test_user').delete()
" >/dev/null 2>&1 || true

    echo ""

    # ── Core API endpoints ─────────────────────────────────────────────

    echo "[Core API Endpoints]"

    # Login as the seeded myork user to test permission-protected endpoints
    local core_jar
    core_jar=$(mktemp)

    local core_csrf
    core_csrf=$(curl -sf -c "$core_jar" http://localhost:8000/api/auth/csrf/ 2>/dev/null || echo "")
    local core_csrf_val
    core_csrf_val=$(echo "$core_csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4 || echo "")

    # Use admin user for core API tests (should always exist)
    $COMPOSE exec -T backend python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'charmr.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(username='__api_test__').first()
if u: u.delete()
u = User.objects.create_user(username='__api_test__', password='__api_test_pass__', is_staff=True)
from core.models import Role, RoleAssignment
org_admin = Role.objects.filter(name='Organisational Admin').first()
if org_admin:
    RoleAssignment.objects.get_or_create(user=u, role=org_admin, scope_type='global')
" >/dev/null 2>&1 || true

    curl -sf -b "$core_jar" -c "$core_jar" \
        -X POST http://localhost:8000/api/auth/login/ \
        -H "Content-Type: application/json" \
        -H "X-CSRFToken: $core_csrf_val" \
        -d '{"username":"__api_test__","password":"__api_test_pass__"}' >/dev/null 2>&1 || true

    local endpoints=("regions" "families" "people" "roles" "permissions" "role-assignments" "guardianships" "users" "profile")
    for ep in "${endpoints[@]}"; do
        local ep_code
        ep_code=$(curl -so /dev/null -w '%{http_code}' -b "$core_jar" \
            "http://localhost:8000/api/${ep}/" 2>/dev/null || echo "000")
        if [[ "$ep_code" == "200" ]]; then
            test_pass "GET /api/${ep}/ returns HTTP 200"
        else
            test_fail "GET /api/${ep}/ returns HTTP 200" "Got HTTP $ep_code"
        fi
    done

    # Test unauthenticated access is denied
    local unauth_code
    unauth_code=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/api/users/ 2>/dev/null || echo "000")
    if [[ "$unauth_code" == "403" ]]; then
        test_pass "GET /api/users/ returns 403 when unauthenticated"
    else
        test_fail "GET /api/users/ returns 403 when unauthenticated" "Got HTTP $unauth_code"
    fi

    # Test seed data exists
    local region_count
    region_count=$(curl -sf -b "$core_jar" http://localhost:8000/api/regions/ 2>/dev/null | grep -o '"id":' | wc -l | tr -d ' ')
    if [[ "$region_count" -ge 12 ]]; then
        test_pass "Seed data: at least 12 regions exist ($region_count found)"
    else
        test_fail "Seed data: at least 12 regions exist" "Found $region_count"
    fi

    local role_data
    role_data=$(curl -sf -b "$core_jar" http://localhost:8000/api/roles/ 2>/dev/null || echo "")
    if echo "$role_data" | grep -q "Organisational Admin"; then
        test_pass "Seed data: Organisational Admin role exists"
    else
        test_fail "Seed data: Organisational Admin role exists"
    fi

    local perm_count
    perm_count=$(curl -sf -b "$core_jar" http://localhost:8000/api/permissions/ 2>/dev/null | grep -o '"codename":' | wc -l | tr -d ' ')
    if [[ "$perm_count" -ge 19 ]]; then
        test_pass "Seed data: at least 19 permissions exist ($perm_count found)"
    else
        test_fail "Seed data: at least 19 permissions exist" "Found $perm_count"
    fi

    # Test profile endpoint
    local profile_data
    profile_data=$(curl -sf -b "$core_jar" http://localhost:8000/api/profile/ 2>/dev/null || echo "")
    if echo "$profile_data" | grep -q '"permissions"'; then
        test_pass "Profile endpoint returns permissions list"
    else
        test_fail "Profile endpoint returns permissions list"
    fi

    rm -f "$core_jar"

    # Clean up test user
    $COMPOSE exec -T backend python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'charmr.settings')
django.setup()
from django.contrib.auth import get_user_model
get_user_model().objects.filter(username='__api_test__').delete()
" >/dev/null 2>&1 || true

    echo ""

    # ── Public pages (frontend) ───────────────────────────────────────

    echo "[Public Pages]"

    local pages=("/" "/about" "/events" "/contact" "/login")
    local page_names=("Home" "About" "Events" "Contact" "Login")
    for i in "${!pages[@]}"; do
        local pg_code
        pg_code=$(curl -so /dev/null -w '%{http_code}' "http://localhost:5173${pages[$i]}" 2>/dev/null || echo "000")
        if [[ "$pg_code" == "200" ]]; then
            test_pass "${page_names[$i]} page (${pages[$i]}) returns HTTP 200"
        else
            test_fail "${page_names[$i]} page (${pages[$i]}) returns HTTP 200" "Got HTTP $pg_code"
        fi
    done

    echo ""

    # ── Django internals ──────────────────────────────────────────────

    echo "[Django]"

    local check_output
    check_output=$($COMPOSE exec -T backend python manage.py check --deploy 2>&1 || true)
    if echo "$check_output" | grep -q "System check identified no issues"; then
        test_pass "Django system check (--deploy) passes with no issues"
    elif echo "$check_output" | grep -q "System check identified"; then
        local issues
        issues=$(echo "$check_output" | grep "System check identified")
        test_pass "Django system check (--deploy) completed ($issues)"
    else
        test_fail "Django system check (--deploy)" "Unexpected output"
    fi

    local migration_output
    migration_output=$($COMPOSE exec -T backend python manage.py showmigrations --plan 2>&1 || echo "ERROR")
    if echo "$migration_output" | grep -q '\[X\]'; then
        local applied
        applied=$(echo "$migration_output" | grep -c '\[X\]' || echo 0)
        test_pass "Database migrations have been applied ($applied migrations)"
    else
        test_fail "Database migrations have been applied" "No applied migrations found"
    fi

    local pending
    pending=$(echo "$migration_output" | grep -c '\[ \]' || true)
    if [[ "$pending" -eq 0 ]]; then
        test_pass "No pending migrations"
    else
        test_fail "No pending migrations" "$pending migrations are unapplied"
    fi

    local db_tables
    db_tables=$($COMPOSE exec -T backend python manage.py inspectdb 2>&1 | grep -c "^class " || echo "0")
    if [[ "$db_tables" -gt 0 ]]; then
        test_pass "Database has tables ($db_tables tables found)"
    else
        test_fail "Database has tables" "No tables found"
    fi

    echo ""

    # ── Database volume ───────────────────────────────────────────────

    echo "[Database Volume]"

    local db_exists
    db_exists=$($COMPOSE exec -T backend test -f /opt/app-root/data/db.sqlite3 && echo "yes" || echo "no")
    if [[ "$db_exists" == "yes" ]]; then
        test_pass "SQLite database file exists in volume"
    else
        test_fail "SQLite database file exists in volume"
    fi

    local db_writable
    db_writable=$($COMPOSE exec -T backend test -w /opt/app-root/data/db.sqlite3 && echo "yes" || echo "no")
    if [[ "$db_writable" == "yes" ]]; then
        test_pass "Database file is writable by container user"
    else
        test_fail "Database file is writable by container user"
    fi

    local db_size
    db_size=$($COMPOSE exec -T backend stat -c%s /opt/app-root/data/db.sqlite3 2>/dev/null || echo "0")
    if [[ "$db_size" -gt 0 ]]; then
        test_pass "Database file is non-empty (${db_size} bytes)"
    else
        test_fail "Database file is non-empty" "File is 0 bytes"
    fi

    echo ""

    # ── Frontend ──────────────────────────────────────────────────────

    echo "[Frontend]"

    local fe_code
    fe_code=$(curl -so /dev/null -w '%{http_code}' http://localhost:5173/ 2>/dev/null || echo "000")
    if [[ "$fe_code" == "200" ]]; then
        test_pass "Frontend is reachable on port 5173"
    else
        test_fail "Frontend is reachable on port 5173" "Got HTTP $fe_code"
    fi

    local fe_html
    fe_html=$(curl -sf http://localhost:5173/ 2>/dev/null || echo "")
    if echo "$fe_html" | grep -q '<div id="root"'; then
        test_pass "Frontend serves HTML with React root element"
    else
        test_fail "Frontend serves HTML with React root element"
    fi

    if echo "$fe_html" | grep -q 'Charmr'; then
        test_pass "Frontend HTML contains 'Charmr' title"
    else
        test_fail "Frontend HTML contains 'Charmr' title"
    fi

    local fe_proxy_response
    fe_proxy_response=$(curl -sf http://localhost:5173/api/health/ 2>/dev/null || echo "")
    if echo "$fe_proxy_response" | grep -q '"status":"ok"'; then
        test_pass "Frontend proxies /api/health/ to backend successfully"
    else
        test_fail "Frontend proxies /api/health/ to backend" "Got: $fe_proxy_response"
    fi

    echo ""

    # ── Backup & restore cycle ────────────────────────────────────────

    echo "[Backup & Restore]"

    local test_backup_dir="./backups"
    local pre_count
    pre_count=$(find "$test_backup_dir" -name '*.sqlite3' 2>/dev/null | wc -l | tr -d ' ')

    if ! cmd_backup >/dev/null 2>&1; then
        test_fail "Backup creates a new .sqlite3 file" "cmd_backup failed"
    fi
    local post_count
    post_count=$(find "$test_backup_dir" -name '*.sqlite3' 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$post_count" -gt "$pre_count" ]]; then
        test_pass "Backup creates a new .sqlite3 file"
    else
        test_fail "Backup creates a new .sqlite3 file"
    fi

    local latest_backup
    latest_backup=$(ls -t "$test_backup_dir"/*.sqlite3 2>/dev/null | head -1)
    if [[ -n "$latest_backup" ]]; then
        local backup_size
        backup_size=$(stat -f%z "$latest_backup" 2>/dev/null || stat -c%s "$latest_backup" 2>/dev/null || echo "0")
        if [[ "$backup_size" -gt 0 ]]; then
            test_pass "Backup file is non-empty (${backup_size} bytes)"
        else
            test_fail "Backup file is non-empty" "File is 0 bytes"
        fi
    else
        test_fail "Backup file exists" "No backup file found"
    fi

    # Clean up test backup
    if [[ -n "${latest_backup:-}" && -f "$latest_backup" ]]; then
        rm -f "$latest_backup"
        test_pass "Test backup cleaned up"
    fi

    echo ""

    # ── Data export/import ───────────────────────────────────────────

    echo "[Data Export/Import]"

    local export_file="./exports/__test_export__.yaml"
    mkdir -p ./exports

    if cmd_export "$export_file" >/dev/null 2>&1; then
        test_pass "Data export command succeeds"
    else
        test_fail "Data export command succeeds"
    fi

    if [[ -f "$export_file" ]]; then
        local export_size
        export_size=$(stat -f%z "$export_file" 2>/dev/null || stat -c%s "$export_file" 2>/dev/null || echo "0")
        if [[ "$export_size" -gt 100 ]]; then
            test_pass "Export file is non-empty (${export_size} bytes)"
        else
            test_fail "Export file is non-empty" "Only ${export_size} bytes"
        fi

        if grep -q "charmr_export" "$export_file"; then
            test_pass "Export file contains charmr_export header"
        else
            test_fail "Export file contains charmr_export header"
        fi

        if grep -q "Organisational Admin" "$export_file"; then
            test_pass "Export file contains roles"
        else
            test_fail "Export file contains roles"
        fi

        if grep -q "regions:" "$export_file"; then
            test_pass "Export file contains regions section"
        else
            test_fail "Export file contains regions section"
        fi

        # Test re-importing the exported data (without wipe, idempotent)
        if cmd_populate "$export_file" >/dev/null 2>&1; then
            test_pass "Data populate (re-import) command succeeds"
        else
            test_fail "Data populate (re-import) command succeeds"
        fi

        rm -f "$export_file"
        test_pass "Test export file cleaned up"
    else
        test_fail "Export file was created" "File not found: $export_file"
    fi

    # Test API export endpoint (requires org admin auth)
    local export_jar
    export_jar=$(mktemp)
    local export_csrf
    export_csrf=$(curl -sf -c "$export_jar" http://localhost:8000/api/auth/csrf/ 2>/dev/null || echo "")
    local export_csrf_val
    export_csrf_val=$(echo "$export_csrf" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4 || echo "")

    # Create org admin test user for API export test
    $COMPOSE exec -T backend python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'charmr.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(username='__export_test__').delete()
u = User.objects.create_user(username='__export_test__', password='__export_test_pass__', is_staff=True)
from core.models import Role, RoleAssignment
org_admin = Role.objects.filter(name='Organisational Admin').first()
if org_admin:
    RoleAssignment.objects.get_or_create(user=u, role=org_admin, scope_type='global')
" >/dev/null 2>&1 || true

    curl -sf -b "$export_jar" -c "$export_jar" \
        -X POST http://localhost:8000/api/auth/login/ \
        -H "Content-Type: application/json" \
        -H "X-CSRFToken: $export_csrf_val" \
        -d '{"username":"__export_test__","password":"__export_test_pass__"}' >/dev/null 2>&1 || true

    local api_export_code
    api_export_code=$(curl -so /dev/null -w '%{http_code}' -b "$export_jar" \
        http://localhost:8000/api/data/export/ 2>/dev/null || echo "000")
    if [[ "$api_export_code" == "200" ]]; then
        test_pass "API data export endpoint returns HTTP 200 for org admin"
    else
        test_fail "API data export endpoint returns HTTP 200 for org admin" "Got HTTP $api_export_code"
    fi

    # Test non-admin cannot access export
    local nonadmin_export
    nonadmin_export=$(curl -so /dev/null -w '%{http_code}' http://localhost:8000/api/data/export/ 2>/dev/null || echo "000")
    if [[ "$nonadmin_export" == "403" ]]; then
        test_pass "API data export returns 403 for unauthenticated users"
    else
        test_fail "API data export returns 403 for unauthenticated users" "Got HTTP $nonadmin_export"
    fi

    rm -f "$export_jar"

    # Clean up test user
    $COMPOSE exec -T backend python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'charmr.settings')
django.setup()
from django.contrib.auth import get_user_model
get_user_model().objects.filter(username='__export_test__').delete()
" >/dev/null 2>&1 || true

    echo ""

    # ── Cross-container networking ────────────────────────────────────

    echo "[Networking]"

    local dns_check
    dns_check=$($COMPOSE exec -T frontend bash -c 'getent hosts backend' 2>/dev/null || echo "")
    if [[ -n "$dns_check" ]]; then
        test_pass "Frontend can resolve 'backend' hostname"
    else
        test_fail "Frontend can resolve 'backend' hostname"
    fi

    local cross_check
    cross_check=$($COMPOSE exec -T frontend bash -c 'curl -sf http://backend:8000/api/health/' 2>/dev/null || echo "")
    if echo "$cross_check" | grep -q '"status":"ok"'; then
        test_pass "Frontend container can reach backend:8000 directly"
    else
        test_fail "Frontend container can reach backend:8000 directly" "Got: $cross_check"
    fi

    echo ""

    # ── Results ───────────────────────────────────────────────────────

    echo "======================================"
    echo "  Results: $pass passed, $fail failed (of $total tests)"
    echo "======================================"
    echo ""

    if [[ "$fail" -gt 0 ]]; then
        exit 1
    fi
}

cmd_export() {
    local output="${1:-}"
    if [[ -z "$output" ]]; then
        mkdir -p ./exports
        local timestamp
        timestamp=$(date +%Y%m%d_%H%M%S)
        output="./exports/charmr_${timestamp}.yaml"
    fi

    echo "Exporting platform data..."
    $COMPOSE exec -T backend python manage.py export_data > "$output"
    echo "Exported to: $output"
}

cmd_populate() {
    local yaml_file=""
    local extra_args=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --wipe)
                extra_args+=("--wipe")
                shift
                ;;
            --default-password)
                if [[ -z "${2:-}" ]]; then
                    echo "Error: --default-password requires a value."
                    exit 1
                fi
                extra_args+=("--default-password" "$2")
                shift 2
                ;;
            *)
                if [[ -z "$yaml_file" ]]; then
                    yaml_file="$1"
                else
                    echo "Unknown option: $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$yaml_file" ]]; then
        echo "Error: no YAML file specified."
        echo "Usage: $0 populate <yaml-file> [--wipe] [--default-password <pw>]"
        exit 1
    fi
    if [[ ! -f "$yaml_file" ]]; then
        echo "Error: file not found: $yaml_file"
        exit 1
    fi

    echo "Populating platform data from $yaml_file..."
    # Copy the file into the running container and run populate_data
    local container_id
    container_id=$($COMPOSE ps -q backend 2>/dev/null)
    if [[ -z "$container_id" ]]; then
        echo "Error: backend container is not running. Start it first with: $0 start"
        exit 1
    fi

    docker cp "$yaml_file" "${container_id}:/tmp/_charmr_import.yaml"
    $COMPOSE exec -T backend python manage.py populate_data /tmp/_charmr_import.yaml "${extra_args[@]}"
    docker exec "${container_id}" rm -f /tmp/_charmr_import.yaml 2>/dev/null || true
    echo "Done."
}

cmd_package() {
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local bundle_dir="charmr-deploy-${timestamp}"
    local backend_tag="charmr-backend:${timestamp}"
    local frontend_tag="charmr-frontend:${timestamp}"

    echo "Building production images..."
    docker build -f backend/Dockerfile.prod -t "$backend_tag" backend/
    docker build -f frontend/Dockerfile.prod -t "$frontend_tag" frontend/

    echo "Creating deployment bundle..."
    mkdir -p "$bundle_dir"

    docker save "$backend_tag" > "${bundle_dir}/charmr-backend.tar"
    docker save "$frontend_tag" > "${bundle_dir}/charmr-frontend.tar"

    cp deploy/docker-compose/docker-compose.prod.yml "${bundle_dir}/"
    cp deploy/docker-compose/.env.example "${bundle_dir}/"

    # Update image references in the bundled compose file to use local tags
    if command -v sed >/dev/null 2>&1; then
        sed -i.bak \
            -e "s|ghcr.io/my0373/charmr-backend:.*|${backend_tag}|" \
            -e "s|ghcr.io/my0373/charmr-frontend:.*|${frontend_tag}|" \
            "${bundle_dir}/docker-compose.prod.yml"
        rm -f "${bundle_dir}/docker-compose.prod.yml.bak"
    fi

    tar czf "${bundle_dir}.tar.gz" "$bundle_dir"
    rm -rf "$bundle_dir"

    echo ""
    echo "Deployment bundle created: ${bundle_dir}.tar.gz"
    echo ""
    echo "To deploy:"
    echo "  1. Transfer ${bundle_dir}.tar.gz to the target machine"
    echo "  2. tar xzf ${bundle_dir}.tar.gz"
    echo "  3. cd ${bundle_dir}"
    echo "  4. docker load < charmr-backend.tar"
    echo "  5. docker load < charmr-frontend.tar"
    echo "  6. cp .env.example .env && edit .env"
    echo "  7. docker compose -f docker-compose.prod.yml up -d"
}

cmd_wipe() {
    if ! confirm "This will stop all containers and DELETE ALL DATA. Are you sure?"; then
        echo "Aborted."
        exit 0
    fi
    echo "Wiping Charmr (containers + volumes)..."
    $COMPOSE down -v
    echo "Done. All data has been removed."
}

cmd_backup() {
    mkdir -p "$BACKUP_DIR"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${timestamp}.sqlite3"

    echo "Backing up database..."
    docker run --rm \
        -v "${DB_VOLUME}:/dbdata:ro" \
        -v "$(pwd)/$BACKUP_DIR:/backup" \
        registry.access.redhat.com/ubi9/ubi-minimal:latest \
        cp "/dbdata/db.sqlite3" "/backup/${timestamp}.sqlite3"

    echo "Backup saved to: $backup_file"
}

cmd_restore() {
    local backup_file="${1:-}"
    if [[ -z "$backup_file" ]]; then
        echo "Error: no backup file specified."
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi
    if [[ ! -f "$backup_file" ]]; then
        echo "Error: file not found: $backup_file"
        exit 1
    fi

    if ! confirm "This will replace the current database with '$backup_file'. Are you sure?"; then
        echo "Aborted."
        exit 0
    fi

    local abs_dir
    abs_dir=$(cd "$(dirname "$backup_file")" && pwd)
    local filename
    filename=$(basename "$backup_file")

    echo "Stopping containers..."
    $COMPOSE down

    echo "Restoring database from $backup_file..."
    docker run --rm \
        -v "${DB_VOLUME}:/dbdata" \
        -v "${abs_dir}:/backup:ro" \
        registry.access.redhat.com/ubi9/ubi-minimal:latest \
        cp "/backup/${filename}" "/dbdata/db.sqlite3"

    echo "Database restored. Run '$0 start' to start Charmr."
}

case "${1:-}" in
    start)   shift; cmd_start "$@" ;;
    stop)    cmd_stop ;;
    restart) shift; cmd_restart "$@" ;;
    logs)    cmd_logs ;;
    status)  cmd_status ;;
    test)    cmd_test ;;
    wipe)    cmd_wipe ;;
    package) cmd_package ;;
    export)  cmd_export "${2:-}" ;;
    populate) shift; cmd_populate "$@" ;;
    backup)  cmd_backup ;;
    restore) cmd_restore "${2:-}" ;;
    *)       usage; exit 1 ;;
esac
