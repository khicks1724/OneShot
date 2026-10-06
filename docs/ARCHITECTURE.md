# Architecture

Browser or ChatGPT iframe → shared validated actions → authoritative game engine → SQLite WAL.

ChatGPT calls Streamable HTTP `/mcp` with an OAuth access token. Its widget calls the same tools over the standard MCP Apps bridge. Browser requests use HTTP-only cookie sessions. Both paths enforce ownership; player IDs from tool arguments are never trusted.

| Module | Responsibility |
| --- | --- |
| `server/store.js` | Schema, indexes, additive migrations and transactions |
| `server/engine.js` | Shared clock, admission, scoring, reveals, finals, profiles, standings |
| `server/questions.js`, `practice.js` | Validated canonical content and separate public practice pool |
| `server/auth.js` | Password hashes, hashed opaque tokens, PKCE, consent, refresh rotation |
| `server/actions.js`, `mcp.js` | Common action contract and authenticated MCP tools/UI |
| `server/ai.js` | Responses API, host personas, coaching, content drafts and fallback |
| `server/index.js` | HTTP routes, rate limits, editorial administration, deletion and health |
| `src/transport.js`, `main.jsx` | Host bridge, theme, interactive game and account screens |

## Persistence and timing

Every show stores an absolute UTC start and a frozen pack digest. Server time determines the current question; clients submit neither score nor elapsed time. A restarted server derives deadlines and settles old unfinished games on demand. Final qualification freezes before final answers. Answers and scores commit together under `BEGIN IMMEDIATE`. The answer primary key prevents replay scoring; a partial unique index enforces one ranked attempt per account/show. A saved pre-answer score hides current correctness from standings until reveal. Reveals occur at fixed deadlines for everyone.

## Trust boundaries

- Passwords use unique salts and scrypt; OAuth codes and account tokens are stored only as hashes.
- Codes expire after two minutes; access after one hour; refresh after 30 days; browser sessions after seven days. Refresh tokens rotate and cannot authenticate resource requests.
- Exact registered redirects, S256 PKCE, resource binding, scope binding, consent and a CSRF nonce are checked.
- Public payloads exclude emails, credentials, future questions and premature answer keys. Club standings require membership.
- UI code is inlined without third-party asset domains. Parent-window bridge messages are source-checked, and requests time out.
- Helmet, same-origin writes, SameSite cookies, input bounds, React text rendering and request limits reduce common web attack surfaces.
- No model output is executed or accepted as a scoring instruction. Editorial source URLs require review.

Single-account admission and authoritative timing do not stop external research, collusion or multiple legitimate accounts. Practice never reads the ranked pool, and production requires private reviewed questions because repository starter keys are public.

## Scaling boundary

This is a single-instance design. Synchronous SQLite and game-row aggregation support a pilot, not an internet-wide show with hundreds of thousands of users. For that scale, migrate persistence to PostgreSQL transactions, introduce durable Redis limiting and rank caches, add event fanout and settlement jobs, and benchmark explicit concurrency targets. Do not share SQLite over a network filesystem or run multiple writable replicas.
