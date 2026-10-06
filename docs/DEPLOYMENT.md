# Deployment

## Pilot hosting

Use Node 24 or the Dockerfile. Mount a writable persistent volume at `/app/data`, keep one replica, and terminate HTTPS at your proxy. The container runs as an unprivileged user. Set `PUBLIC_URL` to the exact public HTTPS origin, `NODE_ENV=production`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ADMIN_TOKEN`, and your shared UTC show time. Supply secrets through the host’s secret settings. Never expose databases, drafts or backups as static assets.

```sh
docker build -t one-shot .
docker run --env-file <private-production-env-file> -p 8787:8787 -v one-shot-data:/app/data one-shot
```

Preserve the public Host header. The app does not trust forwarded IP headers, so proxy users share a rate-limit bucket. Configure a reviewed proxy topology and durable rate limiter before broad rollout. `/health` checks availability. Back up SQLite through its online backup mechanism or a consistent volume snapshot; copying only the main file during WAL writes is unsafe. Test restoration.

## Editorial readiness

Production ranked play rejects public starter packs. Privately generate or author questions, verify citations and accepted aliases, and publish several dates in advance. Publish at least one hour before the appointment. Reviewed packs cannot be replaced. A missing reviewed pack leaves practice available. The daily scheduler advances and settles games; it does not silently publish unreviewed AI content. Background drafting can be scheduled separately on your host.

## ChatGPT linking

Configure `mcp.json` with `npm run configure-plugin -- https://<public-origin>`. Add that origin’s `/mcp` endpoint as a custom MCP plugin with OAuth. Discovery lives at `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`. The server implements `/oauth/register`, `/oauth/authorize` and `/oauth/token` for dynamically registered public clients. Request scope `play` and the exact HTTPS `/mcp` resource. CIMD and private-key JWT clients are not implemented.

Create your One Shot account on the companion web app, then sign in and authorize on the linking page. Open One Shot via `one_shot_dashboard`. Verify the 14 tools, both themes, practice, expiry/relinking and persisted identity in actual ChatGPT. Local tests exercise the protocol but cannot substitute for real host acceptance.

The package’s checked-in URL is localhost for development. Public publication requires a remote HTTPS endpoint, real privacy/support/terms information, demo credentials, and review. No public hosting or submission has been performed.

## Public-release work

Add email verification, password recovery, account export, moderation/reporting, durable abuse controls, monitored backups, structured observability and load tests. Server validation does not guarantee resistance to off-platform research or collusion. Keep private ranked packs out of Git, static files and public test fixtures.

## Live AI

The development request reached the API and returned `credit_balance_exhausted` (429 / insufficient quota). Add credits in [OpenAI billing](https://platform.openai.com/settings/organization/billing), then verify a successful host reaction and draft. This is a balance issue, not a transient request-rate limit. No key rotation is necessary. AI requests time out and use fallback commentary/notes; ranked scoring never depends on a live model response.
