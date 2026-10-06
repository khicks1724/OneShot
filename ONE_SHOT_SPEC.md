# One Shot — canonical specification

## Product

A daily AI-hosted trivia show inside ChatGPT, with a standalone companion app. One shared appointment, one ranked attempt per account, and a running competitive identity. Fairness takes precedence over personalized difficulty.

## Rules

| Round | Questions | Format | Time each |
| --- | --- | --- | --- |
| Warmup | 1–2 | Multiple choice | 25 seconds |
| Culture | 3–4 | Multiple choice | 25 seconds |
| Curveball | 5–6 | Multiple choice | 25 seconds |
| The Wager | 7–8 | Multiple choice + confidence | 25 seconds |
| Final Boss | 9–10 | Free response | 30 seconds |
| Global Final | 11 | Free response, qualified players | 30 seconds |

Eight-second global reveals separate questions. Admission closes when question 1 ends. Top 10% by pre-final score qualify, including all tied cutoff scores. One lifeline per game: curated clue, remove two wrong choices, or double reward and risk. All progression, scoring and deadlines are server-controlled. Practice uses a separate pool, is repeatable, and is excluded from ranked stats.

## Scoring

Correct points = (difficulty × 300 + speed bonus + streak bonus) × wager multiplier × double multiplier.

Speed is 0–100 in three-second buckets based on server receipt time. Streak is 40 per consecutive previous correct answer, capped at five; unanswered questions break it. Confidence is 25/50/75/100, with multiplier confidence/50 on questions 7–8. Double affects only its question. Wrong wager/double answers lose scaled base points; totals floor at zero after each answer. Pending correctness and score changes are hidden until reveal. Buckets soften latency differences but do not eliminate them.

## Identity and social

OAuth links an explicit One Shot account, not an inferred private ChatGPT identity. Public profile fields are display name and chosen region. Guests practice only. Account deletion removes history, relationships and owned clubs. Friend invitations create mutual relationships after acceptance; club invitations grant membership and access to club standings. Rival selection finds the nearest season-score player.

## AI and content

AI creates host reactions, post-game coaching and drafts. It never changes ranked prompts, difficulty, clocks or outcomes. Human-reviewed canonical packs include aliases, hints, explanations, source URLs and a digest and freeze before play. Source URLs in generated drafts require fact-checking. Public starter keys are for local demonstrations only; production requires private reviewed packs. Ranked free-response matching normalizes accents, case, punctuation and articles against frozen aliases.

## Stats, rating and seasons

Eight-week seasons use January 5, 2026 UTC as their epoch. Season boards reset by time window. Current rating is a performance index: 1000 plus sum of rounded ((completed score / 10000 − 0.5) × 60), not Elo. Tiers: Bronze, Silver at 1100, Gold at 1300, Platinum at 1500, Diamond at 1800. Accuracy is correct/submitted ranked answers; unanswered questions count as misses in the final result, but not submitted-answer profile accuracy. Day streaks use UTC dates of completed games. Four factual achievements recognize first game, seven-day streak, sustained 80% accuracy and final qualification.

## Scope and future work

Version 1 implements the complete core play loop, linked identity, social boards and a deployable pilot. The broader brainstorm also proposed experimental mechanics that remain future work: pairwise Elo/placement matches, championship brackets, richer tiers, rival head-to-head history, AI-generated trophies/art, second chance/crowd/time-freeze lifelines, verified city/organization groups, community voting and media rounds. Clubs support private college, company and service leagues today. Region is player-selected metadata, with a backend filter.

The server uses one worldwide UTC show, rather than separate player-local ranked games. Notifications require an explicit supported subscription mechanism; an installed plugin cannot automatically summon the entire ChatGPT user base. Scheduling and push delivery are separate concerns.

## Acceptance

A complete persisted ten-question game; deterministic fair scores; common ranked clock; no future keys or premature correctness in payloads; one ranked admission daily; practice exclusion; OAuth-linked identity; functional clubs/friend links; real MCP UI resources; responsive themes; and automated checks for those boundaries. Hosting, public submission, successful live AI output and internet-scale operations require additional rollout validation.
