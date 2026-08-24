# Production Runbook — Điện Máy 365

## Release topology

TLS terminates at the managed load balancer/CDN. It forwards HTTPS scheme and a request ID to the internal Nginx `web` container. Nginx serves immutable assets and sends PHP requests to PHP-FPM `app`. Laravel uses MySQL, Redis, Inertia SSR, queue workers, scheduler and S3-compatible object storage. MySQL and Redis have no public host ports.

Production uses `compose.production.yaml`; development continues to use `compose.yaml`. Copy `.env.production.example` to a secret-managed environment file and never commit the populated file.

## Release procedure

1. Require green CI, dependency/secret scans, immutable tagged app/web/SSR images and staging approval.
2. Verify the backup destination has enough space and an external retention/replication policy.
3. Run `php artisan ops:production-check --runtime` in staging.
4. Run `BASE_URL=https://staging.example.com RELEASE_TAG=vX.Y.Z ./scripts/production/deploy.sh`.
5. Complete storefront/admin/payment-shipping fail-closed smoke and stakeholder UAT.
6. Promote the same image digests to production; do not rebuild.
7. Monitor 5xx, latency, failed jobs/webhooks, payment mismatches and checkout conversion for 72 hours.

Migrations use `--isolated`. Application rollback changes immutable image tags only. Database migrations are not rolled back in an incident; schema changes must be expand/contract compatible and repaired through a forward fix.

## Backup and restore

`scripts/production/backup.sh` creates a transaction-consistent compressed dump and SHA-256 sidecar. Production additionally requires managed MySQL automated backups and point-in-time recovery outside this repository.

Restore must be rehearsed against a disposable database:

1. Verify target name and stop application writes.
2. Set `CONFIRM_RESTORE=RESTORE` and run `restore.sh BACKUP.sql.gz`.
3. Verify checksum, migration status, row counts and application smoke.
4. Record RPO/RTO, dump identifier, operator and result.

Never rehearse restore against the active production database.

## Incident rollback

Run `BASE_URL=https://shop.example.com ./scripts/production/rollback.sh PREVIOUS_TAG`. If the failure is schema-related, deploy a forward-fix image/migration. For payment mismatch, stop checkout/provider workers if needed, preserve webhook events/audit logs, reconcile with the provider and never fabricate a successful payment.

## Go-live gates

- Production domain, TLS certificate, CDN/proxy allow-list and canonical URL approved.
- `APP_DEBUG=false`; secure/encrypted cookies; MFA enrollment completed for every staff account.
- SMTP/sender domain, S3/CDN, webhook secrets and external alert destinations tested with real sandbox credentials.
- Backup retention and PITR enabled; restore rehearsal evidence signed.
- Search Console/Bing ownership, sitemap, robots, analytics/consent and legal/business information approved.
- Desktop/mobile visual, accessibility, checkout, order and admin UAT signed by named stakeholders.
- On-call ownership, escalation contacts, provider support contacts and 24–72 hour launch watch assigned.

Until these external gates are signed, the repository is deployable to staging but must not be described as production-launched.
