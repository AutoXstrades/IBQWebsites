# IBQ — Vercel + Supabase

## Current resources

- Website domain: `ibqwebsites.com` (GoDaddy).
- Google Cloud project: `ibq-websites`. The owner approved Google's User Data Policy and created `IBQ Websites — Web`. Its ID and secret are configured in the git-ignored local and Supabase deployment environments. The live Vercel environment is not configured yet.
- Supabase project: `hgkjpfpqjxsqeppapiyl`, East US. PostgreSQL tables are migrated, RLS enabled, Data API disabled, and `ibq-private` storage is private.
- The local `.env.supabase.local` contains server credentials for the IBQ project and is git-ignored. Do not upload it to GitHub or expose it to the browser.
- Existing SQLite demo data is preserved in `prisma/dev.db`. It has not been copied into the live database.

## Google OAuth

The **Web application** client `IBQ Websites — Web` exists in project `ibq-websites`. Do not create a duplicate. Local sign-in reaches Google's account chooser successfully; the owner must finish consent before end-to-end login can be verified.

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

The owner is signed in, but the selected team is on **Hobby**. Vercel restricts Hobby to personal, non-commercial use, so do not deploy this commercial IBQ site on that plan. The owner must choose a commercial plan or another host before deployment. No subscription has been started and no DNS records have been changed. Official policy: https://vercel.com/docs/plans/hobby

The complete Next.js application is now in the `site/` directory on the `codex/ibq-cloud-app` branch of `AutoXstrades/IBQWebsites`. The original static prototype remains untouched on `main`. Import that application branch into Vercel with **Root Directory = site**. Do not deploy only the static root `index.html` and expect accounts/payments to work. The application source contains no local environment secrets or SQLite demo database.

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

After Vercel deploys successfully, add `ibqwebsites.com` and `www.ibqwebsites.com` to that project. Copy the exact DNS records Vercel supplies into GoDaddy. The domain currently points to GoDaddy WebsiteBuilder; leave its DNS intact until there is a working Vercel target. Keep unrelated mail/TXT records.

## Storage and testing

Uploads pass through authenticated server routes and are limited to 4 MB per file to fit Vercel's request-body limit. No Supabase secret is shipped to the client. Reference images require ownership; delivered source/files require payment as well. Signed download links expire after 60 seconds. Supabase files are not stored on Vercel's ephemeral disk.

Local SQLite development still works normally with `.env`. To validate Supabase deliberately:

```powershell
$env:DOTENV_CONFIG_PATH='.env.supabase.local'
node scripts/prisma.mjs generate
node --env-file=.env.supabase.local scripts/check-supabase.mjs
```

The check rolls back synthetic database records and removes its synthetic storage object. Restore the SQLite Prisma client before local development with `npm run db:generate` in a fresh shell. Stop a running local server before regenerating Prisma on Windows (it holds the engine DLL open).

Local fake payments require `ALLOW_LOCAL_TEST_PAYMENTS=true`. They are always disabled in production. Missing Stripe credentials therefore cannot silently unlock paid deliverables. Google login, Stripe webhooks, production notification email, custom-domain DNS/TLS, and a full customer purchase/delivery flow still need live verification before launch.
