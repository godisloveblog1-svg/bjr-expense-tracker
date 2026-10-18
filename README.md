# BJR Expense Tracker

An accountability ledger for client/investor work: every rupee received, every rupee spent,
the remaining balance, and startup investments — with receipt proof and an audit trail.

**Live:** https://bjr-expense-tracker.vercel.app
**Client ledger:** `/ledger/<client-slug>` (public read-only — no login for the investor)
**Admin:** `/admin` (Supabase Auth email + password)

---

## How the money adds up

| Figure | Formula |
|---|---|
| Available balance | **Funds received − total spent** |
| Total invested | **All expenses (auto-counted) + direct investments** (uploaded in the admin panel) |

- Expenses → `expenses` table (itemised in *All Expenses*, with receipts)
- Money received → `funds` table (drives the balance)
- Direct investments → `investments` table (listed in *Total Investments*, does **not** affect the balance)
- Only the *All Expenses* view lists expense rows; direct investments are never duplicated there,
  but still count toward the headline Total Invested figure.

## Security model

| Who | Can do |
|---|---|
| Anyone with the client ledger URL | **Read** the ledger (deliberate — the investor needs no account) |
| Signed-in admin | Insert / edit / soft-delete on `expenses`, `funds`, `investments`, upload receipts |
| Nobody (signed out) | Cannot write, delete, or upload anything |

- Admin sign-in is real **Supabase Auth** (`signInWithPassword`); the session token authorises writes.
  There is no password in the client bundle.
- Every change is logged in `audit_log` by database triggers — including who (`auth.jwt() ->> 'email'`)
  and when, with before/after values.
- Deletes are **soft deletes**: the row leaves the ledger and the client's view but stays recoverable
  from the admin **Activity & Audit Trail** tab.

## Local development

```bash
npm install
cp .env.example .env      # then fill in the Supabase values
npm run dev               # http://localhost:5173
npm run lint
npm run build
```

## Environment variables

| Key | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (public by design; RLS enforces access) |
| `VITE_GOOGLE_BACKUP_WEBHOOK_URL` | — | Optional off-site copy to Google Sheets/Drive (see `google-backup-script.js`) |
| `VITE_BASE_PATH` | — | Only for the GitHub Pages build (set automatically by the workflow) |

## Database setup (run once, in this order)

Supabase → SQL Editor → New query → Run:

1. `supabase_setup_funds.sql` — funds table + RLS
2. `supabase_setup_investments.sql` — investments table + RLS
3. `supabase_setup_security.sql` — public **read** only; writes require a signed-in admin
4. `supabase_setup_audit.sql` — soft-delete columns, `audit_log` table + triggers, restore support

Then create the admin login: **Authentication → Users → Add user** (email + password, tick
*Auto Confirm User*). That email/password is what you use at `/admin`.

Every script is idempotent — re-running them is safe.

## Deployment

- **Vercel** (primary): connected to this repo, deploys `main` automatically. `vercel.json` rewrites
  all paths to `index.html` so deep links like `/ledger/<slug>` work.
- **GitHub Pages**: `.github/workflows/deploy.yml` builds with `VITE_BASE_PATH=/<repo>/` and copies
  `index.html` to `404.html` for SPA deep links. Requires repo secrets `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions).
- `.github/workflows/ci.yml` runs lint + build on every push and pull request.

## Repo map

```
src/pages/AdminDashboard.jsx   admin tabs: expenses, funds, investments, categories, activity
src/pages/ClientLedger.jsx     public client ledger (expenses + investments views)
src/components/                Header, Sidebar, ExpenseTable, AuditTrail, AdminPasswordGate
src/lib/*Service.js            Supabase access per domain (expenses, funds, investments, categories, audit)
src/lib/softDelete.js          soft-delete + "column not migrated yet" fallbacks
src/lib/pdfExport.js           audit PDF (expenses table + direct investments section)
supabase_setup_*.sql           database setup, run in the order listed above
google-backup-script.js        optional Apps Script for Google Sheets backup
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Figures show `—` with a "Sync issue" warning | A fetch failed. Nothing is lost — press **Retry** |
| "Invalid login credentials" at `/admin` | No matching user in **Authentication → Users**, or the password is wrong (reset it there) |
| Activity tab says the audit trail is not enabled | Run `supabase_setup_audit.sql` |
| Writes fail after signing in | `supabase_setup_security.sql` has not been run, or you are signed out |
| Blank page on GitHub Pages | `VITE_BASE_PATH` missing in that build |
| Uploads fail | Must be signed in as admin; the `bills` storage bucket allows public read only |

## Development notes

- **Lint warnings are advisory.** `oxlint` reports a few React-Compiler style notices
  (`react(purity)` for `Date` usage, `react(set-state-in-effect)` for "fetch then setState"
  effects). They do not affect behaviour; the patterns are deliberate.
- Money formatting is centralised in `src/lib/utils.js` (`formatINR`, `formatTransactionCount`).
- Figures are computed in the page components; services only talk to Supabase.
- When a fetch fails the UI shows `—` plus a Retry warning — never a false `₹0`.

## Data safety

- `backups/` is intentionally untracked (contains client financial data).
- The Supabase tables + audit trail are the source of truth; the Google Sheets copy is a convenience.
- The Google webhook posts with `mode: "no-cors"`, so it can only confirm "sent", not "delivered".
