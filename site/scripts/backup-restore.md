# Encrypted local backups

The production installer keeps the backup runtime and credentials in the owner-only `C:\Users\nickv\.ibq-secure\ibq` directory. Do not copy that directory into GitHub or deploy it.

The scheduled task runs `backup.mjs` every day, encrypts a consistent application-table snapshot and attached private files using AES-256-GCM, and verifies recovery into an isolated local PostgreSQL engine. It also checks each restored file's SHA-256 digest. Only encrypted backups are written to disk. Logs contain counts/status, not customer contents. Backup status is recorded in `backup-status.json`; check it after missed runs.

The active encryption key is protected by Windows DPAPI for this Windows account. **Store `backup-key.dpapi.recovery.txt` offline in a password manager or encrypted removable drive, separate from this computer.** Losing both the Windows profile and the recovery key makes the backups unrecoverable. Never share the key with customers or upload it to the public repository.

Daily jobs require this computer and the configured Windows account to be available. Missed scheduled runs are configured to start when available. These backups are not off-site disaster recovery until you copy the encrypted archives and keep a separately protected recovery key elsewhere. No paid service was purchased.

Files are retained rather than silently deleted. Monitor disk space. Current safety cap is 256 MB of serialized data; exceeding it fails the backup and updates the failure status instead of claiming success. Before growth reaches this cap, move to a streaming/off-site backup architecture.

Verify an archive without modifying production:

```powershell
node C:/Users/nickv/.ibq-secure/ibq/backup.mjs --verify C:/Users/nickv/.ibq-secure/ibq/backups/ARCHIVE.ibqbackup
```

Recovery: provision an isolated PostgreSQL/Supabase project, apply the saved migrations, restore rows in parent-before-child table order, and restore saved objects to a private bucket under the saved keys. Validate ownership, payment totals, file hashes, and auth behavior before switching the application. The automated rehearsal proves schema/data loading and file-byte integrity locally; an actual cloud failover remains an owner-supervised operation. Never overwrite the live project as a test.
