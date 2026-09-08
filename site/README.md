# IBQ — I Build Quality

A production-oriented local web app for an independent website studio. It includes the public marketing site, free and paid quote flows, Google and credentials authentication, customer project accounts, an admin control room, local image and file delivery, SQLite persistence, and Stripe test-mode payments.

## Local setup

Requirements: Node.js 20+ and npm.

```bash
npm i
copy .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Local seed accounts:

- Admin: `admin@ibq.local` / `ChangeMe123!`
- Customer: `demo@ibq.local` / `demo1234`

Change the seeded admin password before using this outside local development.

## Environment

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL`: local SQLite path; the default is `file:./dev.db`.
- `AUTH_SECRET`: a long random secret used to sign persistent sessions.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`: a Google Cloud OAuth web client. Add `http://localhost:3000/api/auth/callback/google` locally and `https://YOUR-DOMAIN/api/auth/callback/google` in production as authorized redirect URIs.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe test-mode credentials.
- `ADMIN_EMAIL`: the only email allowed into `/admin`.
- `NEXT_PUBLIC_APP_URL`: application origin, normally `http://localhost:3000` locally.
- `RESEND_API_KEY` and `FROM_EMAIL`: optional email delivery for new-ticket and update notifications. Without them, local notifications are written to the development terminal.

Local simulated payments require a blank Stripe secret and an explicit `ALLOW_LOCAL_TEST_PAYMENTS=true`. Simulation is always disabled in production.

## Stripe test webhook

With the Stripe CLI installed and authenticated:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`. The checkout route only creates test-mode Checkout Sessions when a test secret key is configured.

## Useful commands

Security maintenance: Next.js and its ESLint config are pinned to 16.3.4, and Prisma CLI/client to 6.19.3. Prisma's Effect dependency is patched in that release. The scoped `@prisma/config` override selects `deepmerge-ts` 8.0.0 to address GHSA-ggr8-5vv4-36mx while retaining Prisma 6 and the existing SQLite schema. Review this override when upgrading Prisma; remove it once the upstream dependency is patched. Version 8 changes deep Map merging, so custom Prisma configurations using Maps need a compatibility check. Keep `package-lock.json` with the project so installs include the patched Sharp 0.35.4 image library.

```bash
npm run dev
npm run build
npm run lint
npx prisma migrate dev
npm run db:seed
```

New local uploads are private in `.ibq-storage`, served through authenticated ownership checks. Hosted deployments use the private Supabase bucket with expiring signed downloads; delivered files require payment. Uploads are limited to 4 MB for Vercel compatibility.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the prepared Google OAuth, Vercel, Supabase, and GoDaddy setup. The updated packages are Single Page $500, Full Website $999, and Custom from $2,500. The $50 visual and $100 downloadable prototype stages are unchanged.
