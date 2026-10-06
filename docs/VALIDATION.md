# Validation

Local checks: October 5, 2026, America/Los_Angeles. Identity refresh verified in the same session.

## Verified

- Frontend production build and self-contained MCP widget bundle.
- Automated engine/HTTP checks covering hidden keys and pending correctness, separate practice content, ownership, entry cutoff, late/future/replayed answers, scoring/wager floors, latency buckets, streak breaks, lifelines, finals/ties, restart settlement, aliases, content schema, guest restrictions, registration, PKCE/resource binding/refresh replay rejection, MCP initialize/list/UI-resource read, clubs, friend links, deletion and AI fallback. See `npm test` for the current count.
- Eight browser checks on 1440px desktop and 390px mobile: both themes, all navigation tabs, a full perfect practice game, account registration, profile editing, club creation, actual custom font loading, both mascot concepts, pointer response, tap reactions, saved selection, game reactions and reduced-motion handling; no page errors or checked-screen horizontal overflow.
- Inspected screenshots of both themes and responsive sizes. Demo state contains real local test activity, not invented competitors.
- Dependency audit reported zero known vulnerabilities during installation.

## Unverified

Successful live AI generation (blocked by exhausted credits), public HTTPS hosting, real ChatGPT OAuth/widget acceptance, directory publication, Docker execution on this Windows machine, public-scale load/failure behavior and email recovery/deliverability.

## Reproduce

Run `npm run build`, `npm test`, and `npm run test:e2e`. Install Chromium with `npx playwright install chromium`, or select installed Chrome with `PLAYWRIGHT_CHANNEL=chrome`. Automated suites use private isolated databases and do not need API credits. Credentials, databases, draft packs and transient results are ignored by Git.
