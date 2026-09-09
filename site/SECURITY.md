# Security controls

Production onboarding uses verified Google identities only. Local development retains password accounts. Sessions are checked against account status and a revocable session version on every authenticated request; admin sessions expire after eight hours, and sensitive admin writes require a sign-in within fifteen minutes. Logout revokes all sessions for that account.

Application request limits live in the database, not server memory. Intake text, JSON/multipart sizes, reference counts, and per-account ticket creation are bounded. Private image uploads are decoded, dimension-limited, stripped of metadata, and re-encoded. Downloads are authorized on the server and returned with no-store, attachment/sandbox policies as appropriate. Documents remain admin-supplied: file-signature checks are not a malware-scanning guarantee.

The application database role must have no superuser, role/database-creation, or RLS-bypass privileges. Migration and backup credentials are separate. RLS policies permit only the designated server roles; tenant authorization is still enforced in the application. Audit events are append-only for the runtime role. SSL is required and the Prisma client validates against the bundled official Supabase CA.

Payment configuration defaults to `PAYMENTS_MODE=off`. Test mode needs explicit configuration and Stripe test keys. Live mode additionally needs `PAYMENTS_LIVE_APPROVED=true` and a live key; do not set this without the owner's explicit go-live approval. Webhooks verify signatures, mode, amounts, currency, local payment identity, and settled status; event processing is transactional and deduplicated. Refunds/disputes freeze delivery for manual review. A successful browser redirect never settles an order.

Manual payment entries require fresh sign-in, exact expected amounts, a receipt reference, an explanation, and an audit record. They cannot replace/repeat a pending or settled checkout. Expired Stripe sessions must be confirmed expired by Stripe before a fresh checkout can be opened.

Backups are encrypted locally and restored into an isolated database for verification. See `scripts/backup-restore.md` for limitations and recovery-key handling. Scheduled backups do not replace off-site copies, disk monitoring, or owner-supervised cloud recovery.

Run `npm run test:security`, `npm run lint`, `npm audit`, and `npm run build` before release. CI uses isolated SQLite data and no production secrets. Secret scanning and dependency alerting should remain enabled. Never commit private environment files, backups, recovery keys, customer exports, or runtime logs.

Operational items requiring owner follow-through: preserve an offline backup recovery key; enable/review MFA on Google, GitHub, Vercel, Supabase and the registrar; periodically review collaborators and rotate provider credentials when exposure is suspected. Network allowlisting requires a stable egress design; do not lock a dynamic Vercel deployment out of its database by guessing IPs.
