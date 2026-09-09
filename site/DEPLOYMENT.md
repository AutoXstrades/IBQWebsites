# IBQ — Vercel + Supabase

## Current resources

- Website domain: `ibqwebsites.com` (GoDaddy).
- Google Cloud project: `ibq-websites`. The owner approved Google's User Data Policy and created `IBQ Websites — Web`. Its ID and secret are configured locally and in Vercel's production environment. End-to-end Google login on the custom domain remains unverified.
- Live app: https://ibqwebsites.com (backup deployment URL: https://ibq-websites.vercel.app). Vercel project `ibq-websites` (`prj_gA6cLQ4hLB7qMOrEsp6CFBAHD8Wg`), team `nickvongii-3687s-projects`. First production deployment `dpl_3qEJoMfJ3MiJeaK4t7LJgmVahx9K` is READY.
- Supabase project: `hgkjpfpqjxsqeppapiyl`, East US. PostgreSQL tables are migrated, RLS enabled, Data API disabled, and `ibq-private` storage is private.
- The local `.env.supabase.local` contains server credentials for the IBQ project and is git-ignored. Do not upload it to GitHub or expose it to the browser.
- Existing SQLite demo data is preserved in `prisma/dev.db`. It has not been copied into the live database.

## Google OAuth

The **Web application** client `IBQ Websites — Web` exists in project `ibq-websites`. Do not create a duplicate. Local sign-in reached Google's account chooser; the delayed return failed because its PKCE cookie expired. Local `AUTH_URL` is now explicitly `http://localhost:3000` to avoid error redirects to `0.0.0.0`. Repeat a fresh login on the custom domain after DNS/TLS is verified; do not reuse an old authorization code.

Authorized JavaScript origins:

```text
https://ibqwebsites.com
https://www.ibqwebsites.com
http://localhost:3000
```

Authorized redirect URIs:

```text
https://ibqwebsites.com/api/auth/callback/google
https://www.ibqwebsites.com/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

Google does not support a private LAN IP as a normal OAuth web origin. Use localhost for local Google-login checks, or the HTTPS deployment on a phone. Request only the default `openid`, `email`, and `profile` scopes. Auth.js rejects unverified Google emails, creates a customer record on first sign-in, and uses the same account dashboard as credentials login.

Save the client ID and secret as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in Vercel's server environment. While Google is in Testing, add the owner's Google account as a test user. Public customer login requires publishing the Google app when ready. If Google requests a privacy policy or verification, supply approved business details rather than placeholder legal text.

## Vercel

The owner upgraded the selected Vercel team to **Pro** and approved Vercel CLI 59.12.0 sign-in. The official CLI successfully created/configured the project, connected GitHub, installed 13 production environment variables, and deployed the app. Production uses Next.js, Node 22.x, root `site`, `npm ci`, and `npm run build`. Secrets were passed through stdin and stored as Vercel secrets, not command-line arguments. No cloud demo seeding was performed. Preview/development environments were deliberately not populated with production credentials.

The complete Next.js application is now in the `site/` directory on both `main` and `codex/ibq-cloud-app` of `AutoXstrades/IBQWebsites` (commit `6430937`). The fast-forward only added files under `site/`; the original static prototype and vault files remain unchanged. Configure Vercel with **Root Directory = site**. Do not deploy only the static root `index.html` and expect accounts/payments to work. The application source contains no local environment secrets or SQLite demo database.

Production admin email/password registration and login are blocked: the admin must use verified Google sign-in. Existing unverified password accounts are not silently merged into Google accounts. The production build and TypeScript/lint checks pass; production-mode tests confirm customer password login works, admin password login is denied, and missing payment keys fail closed.

Use the Next.js framework preset, Node 22+, and `npm run build`. Do not run demo seeding in Vercel. Configure:

- `DATABASE_URL`: Supabase transaction pooler, port 6543, `pgbouncer=true`, `connection_limit=1`, `sslmode=require`.
- `DIRECT_URL`: Supabase session pooler, port 5432, `sslmode=require`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=ibq-private`.
- `AUTH_SECRET`: a newly generated long random production secret.
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
- `AUTH_TRUST_HOST=true`.
- `ADMIN_EMAIL`: the owner's verified Google email (not the local demo admin).
- `NEXT_PUBLIC_APP_URL=https://ibqwebsites.com`.
- Stripe TEST credentials and webhook secret when payments are configured.
- Notification email credentials when an email provider is connected.

The build chooses PostgreSQL automatically when `DATABASE_URL` is a PostgreSQL URL. `npm run db:deploy` applies committed PostgreSQL migrations without a reset. Initial cloud migration has already been applied. Do not point preview deployments at a production customer database unless explicitly intended.

Both `ibqwebsites.com` and `www.ibqwebsites.com` are attached to the Vercel project. GoDaddy identity verification was completed, and the A record is saved as `216.150.1.1`. The existing www CNAME remains `ibqwebsites.com.`. Vercel verifies **both domains configured correctly**, so no additional DNS change is required. Its alternative/recommended records are recorded here for reference, not as outstanding work:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 216.150.1.1 |
| A | @ | 216.150.16.1 |
| CNAME | www | 052eb35478a6ceb1.vercel-dns-016.com. |

The old WebsiteBuilder A record (76.223.105.230 / 13.248.243.5) was replaced after the owner's verification. All other GoDaddy records were preserved, including NS/SOA, pay, _domainconnect and _dmarc. An optional www CNAME edit was cancelled without saving after Vercel confirmed the existing alias is valid. GoDaddy nameservers remain ns43/ns44.domaincontrol.com; do not change them just because `domains inspect` displays Vercel's optional nameserver suggestion.

Vercel issued a managed certificate for both names. Real HTTPS requests to the apex home, www home, login, and Auth.js provider endpoint succeeded with HTTP 200. The www domain now has a Vercel 308 redirect to the apex, verified on `/login`, so authentication cookies consistently use `ibqwebsites.com` and do not split between hosts. Google sign-in on the live domain reaches the expected account chooser with the correct HTTPS callback and only openid/profile/email scopes. The owner must finish this fresh flow before authenticated dashboard/admin access can be marked verified.

Hosted checks passed: public home/packages/login/provider endpoints return 200; account/admin return 307 when unauthenticated; private file route returns 401. The cloud build generated PostgreSQL Prisma Client successfully and audited 425 packages with zero vulnerabilities. At a 390×844 phone viewport, the vault opens, scrolling reaches the footer, and document width stays within the viewport. The $999 ad shows the 72-hour wording. These checks do not yet prove a complete authenticated customer purchase/delivery flow.

## Storage and testing

Uploads pass through authenticated server routes and are limited to 4 MB per file to fit Vercel's request-body limit. No Supabase secret is shipped to the client. Reference images require ownership; delivered source/files require payment as well. Signed download links expire after 60 seconds. Supabase files are not stored on Vercel's ephemeral disk.

Local SQLite development still works normally with `.env`. To validate Supabase deliberately:

```powershell
$env:DOTENV_CONFIG_PATH='.env.supabase.local'
node scripts/prisma.mjs generate
node --env-file=.env.supabase.local scripts/check-supabase.mjs
```

The check rolls back synthetic database records and removes its synthetic storage object. Restore the SQLite Prisma client before local development with `npm run db:generate` in a fresh shell. Stop a running local server before regenerating Prisma on Windows (it holds the engine DLL open).

Local fake payments require `ALLOW_LOCAL_TEST_PAYMENTS=true`. They are always disabled in production. Missing Stripe credentials therefore cannot silently unlock paid deliverables. Custom-domain DNS/TLS is verified. End-to-end Google login, Stripe webhooks, production notification email, and a full customer purchase/delivery flow still need live verification before accepting customers/payments.
