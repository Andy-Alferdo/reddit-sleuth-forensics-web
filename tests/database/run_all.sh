#!/usr/bin/env bash
# Run every database test against local Supabase Docker.
# Usage: bash tests/database/run_all.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Running DB tests against: $DB_URL"
echo

FILES=(
  "00_setup.sql"
  "01_functions.sql"
  "02_rls_investigation_cases.sql"
  "03_rls_reddit_posts.sql"
  "04_rls_reddit_comments.sql"
  "05_rls_user_profiles_analyzed.sql"
  "06_rls_analysis_results.sql"
  "07_rls_monitoring_sessions.sql"
  "08_rls_investigation_reports.sql"
  "09_rls_audit_logs.sql"
  "10_rls_user_roles.sql"
  "11_rls_user_invites.sql"
  "12_rls_profiles.sql"
  "99_teardown.sql"
)

for f in "${FILES[@]}"; do
  echo "--- Running $f ---"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$DIR/$f"
done

echo
echo "✅ All database tests passed."
