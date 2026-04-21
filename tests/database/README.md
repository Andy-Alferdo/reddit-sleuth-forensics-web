# Database Tests — RLS Policies & Functions

Tests for every RLS policy and database function in the Intel Reddit project, designed to run against a **local Supabase Docker** instance.

## Prerequisites

1. Local Supabase running: `supabase start`
2. All migrations applied: `supabase db reset`
3. `psql` installed and on `PATH`

The default local connection string is:
```
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Test Files

| File | What it tests |
|------|---------------|
| `00_setup.sql` | Creates 3 fixture users (admin, alice, bob) + cases. Run **first**. |
| `01_functions.sql` | All DB functions (`has_role`, `hash_case_password`, `verify_case_password`, `generate_invite_token`, `mark_invite_used`, `log_audit_event`, `update_updated_at_column`, `handle_new_user`). |
| `02_rls_investigation_cases.sql` | Owner can CRUD own cases, cannot see others; admin sees all. |
| `03_rls_reddit_posts.sql` | Case-scoped post access via `case_id`. |
| `04_rls_reddit_comments.sql` | Case-scoped comment access. |
| `05_rls_user_profiles_analyzed.sql` | Case-scoped profile access. |
| `06_rls_analysis_results.sql` | Case-scoped analysis results. |
| `07_rls_monitoring_sessions.sql` | Case-scoped monitoring sessions. |
| `08_rls_investigation_reports.sql` | Case-scoped reports (insert/select only). |
| `09_rls_audit_logs.sql` | Users see own logs, admins see all, no UPDATE/DELETE. |
| `10_rls_user_roles.sql` | Only admins manage roles; users see own role. |
| `11_rls_user_invites.sql` | Admin manage; anyone can read valid (unexpired, unused) invites. |
| `12_rls_profiles.sql` | User sees/updates own profile; admin sees all. |
| `99_teardown.sql` | Removes all fixtures. |

## Running

### Run everything in order
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -v ON_ERROR_STOP=1 \
  -f tests/database/00_setup.sql \
  -f tests/database/01_functions.sql \
  -f tests/database/02_rls_investigation_cases.sql \
  -f tests/database/03_rls_reddit_posts.sql \
  -f tests/database/04_rls_reddit_comments.sql \
  -f tests/database/05_rls_user_profiles_analyzed.sql \
  -f tests/database/06_rls_analysis_results.sql \
  -f tests/database/07_rls_monitoring_sessions.sql \
  -f tests/database/08_rls_investigation_reports.sql \
  -f tests/database/09_rls_audit_logs.sql \
  -f tests/database/10_rls_user_roles.sql \
  -f tests/database/11_rls_user_invites.sql \
  -f tests/database/12_rls_profiles.sql \
  -f tests/database/99_teardown.sql
```

### Or use the helper script
```bash
bash tests/database/run_all.sh
```

## Convention

Every test uses the `assert(condition, label)` helper from `00_setup.sql`. On failure it raises an exception and `psql` exits non-zero (because of `ON_ERROR_STOP=1`). On success you'll see `NOTICE:  PASS: <label>`.

RLS is simulated by switching the JWT claim:
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"<uuid>","role":"authenticated"}';
```

This makes `auth.uid()` return that UUID inside the transaction.
