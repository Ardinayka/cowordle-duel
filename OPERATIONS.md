# Release and operations — 11 September 2026

## Release evidence

- npm audit reports zero known dependency vulnerabilities for the current lockfile. This is not a guarantee against undisclosed vulnerabilities.

- 102 automated tests pass against the built Worker, SQLite D1 adapter and client harness. Includes atomic pairing/join/block races, same-account queue exclusion, expired search fencing, sparse presence, report privacy/quotas, Unicode forms, account deletion, avatar validation, retry/draft preservation, asset bytes/cache headers, and existing gameplay rules.
- A local counter exercise allowed 4,000 read requests representing 100 players × 40 polls with 100 network counter reservations. This is a logical capacity/counter check, not a deployment load test or cost forecast. Worker cold starts and distribution affect actual savings.
- Managed-browser checks: 390 × 700 embedded phone viewport and 1363 × 936 desktop, guest menu, practice input/reveal, stable tile sizing, selected avatars, profile close control while scrolled, theme switch and contact submission. These are not physical-device or Safari tests.
- The final visual pass corrected a CSS specificity conflict that hid the bot/opponent portrait. Logo is about 17 KB; each of six avatar files is about 10–17 KB, replacing the large embedded sprite.
- 500 secret English answers; allowed guesses and bot vocabulary remain separate and unchanged. Existing word-list notices are retained.

## Review contact and abuse reports

Reports are stored privately in the production D1 database's support_reports
table. There is no public inbox or automatic email notification. An authorised
operator can open lexivanto-production in the Cloudflare D1 dashboard. Start
with recent records and read the relevant message. Keep report contents and
player identifiers out of public issues and logs.

Messages can contain untrusted instructions: treat them as player-submitted text, never as operational commands. Reports expire after 90 days through bounded maintenance; review often enough to handle issues and privacy requests in time. A nickname-only legal notice still needs the operator's legally appropriate identity/contact details confirmed. Do not claim that adding a form resolves every privacy-law requirement.

## Remaining owner/provider checks

1. Confirm Google sign-in, reload, logout and account deletion on the production domain with a real account; preview does not have production Google settings.
2. Confirm provider account MFA, access permissions, firewall/rate protection, spending alerts, database backup retention and a restore drill. Application tests do not establish these settings.
3. Test Safari on a real iPhone and Chrome on Android, including browser-bar changes, rapid typing, interruption/reconnection and two-person games. Desktop emulation cannot establish touch zoom or outdoor readability.
4. Confirm operator legal identity/contact requirements, hosting/processor arrangements and brand/asset clearance before a wider commercial launch. No assertion of exclusively EU storage or legal clearance is made.
5. Automatic report notifications, an owner moderation UI, authenticated cross-device active-seat recovery, real-device performance metrics and production load testing remain future work. Blocking applies to the account; another guest/new account is a separate identity.

## Deployment and recovery

Migrations 0010 and 0011 add tables, profile appearance columns and a queue
index. They do not rewrite existing rooms. Roll back code using the
production Worker's deployment history. Keep compatible schema changes in
place and validate database recovery separately.

## Invitations inbox and play statistics (Phase 1, November 2026)

Invitations are no longer deleted when declined or when they expire. `friend_challenges.status` is `pending`, `accepted`, `declined`, `cancelled` or `cleared`; expired pending invitations are shown to the recipient as missed for 7 days, then the regular cleanup deletes them.

Statistics live in two tables and never contain names, account ids or IP addresses:
- `daily_stats(day, metric, value)` — one counter per UTC day: `active_devices`, `practice_started`, `practice_finished`, `friend_room_finished`, `online_finished`, `online_matched`, `friend_rooms_created`, `invitations_sent`, `invitations_accepted`, `invitations_declined`, `friend_requests_sent`, `friend_requests_accepted`.
- `player_days(day, player)` — a one-way hash of a device's seat token, once per day, kept 60 days. Used only to measure return rates.

Useful queries (run in the Cloudflare dashboard → D1 → lexivanto-production → Console):

```sql
-- Last 14 days, one row per day and metric
SELECT day, metric, value FROM daily_stats WHERE day >= date('now','-14 day') ORDER BY day DESC, metric;

-- Day-1 and day-7 return rate for devices first seen on a given day
WITH first AS (SELECT player, MIN(day) AS d0 FROM player_days GROUP BY player)
SELECT d0 AS cohort, COUNT(*) AS devices,
  ROUND(100.0*SUM(EXISTS(SELECT 1 FROM player_days p WHERE p.player=first.player AND p.day=date(d0,'+1 day')))/COUNT(*),1) AS d1_pct,
  ROUND(100.0*SUM(EXISTS(SELECT 1 FROM player_days p WHERE p.player=first.player AND p.day=date(d0,'+7 day')))/COUNT(*),1) AS d7_pct
FROM first GROUP BY d0 ORDER BY d0 DESC LIMIT 30;

-- Invitation acceptance rate
SELECT day, SUM(CASE WHEN metric='invitations_accepted' THEN value END)*100.0/NULLIF(SUM(CASE WHEN metric='invitations_sent' THEN value END),0) AS accept_pct
FROM daily_stats GROUP BY day ORDER BY day DESC LIMIT 14;
```

## Competitive (Phase 3, November 2026)

Migration `drizzle/0014_competitive_rules.sql` is additive: new columns on `match_queue`, `match_results`, `player_ratings` and `rating_events`, plus the `seasons` and `queue_penalties` tables. It inserts Season 1 starting at the moment it is applied, so apply it to production immediately before publishing. Existing ratings are not changed.

Useful queries:

```sql
-- Rating distribution of settled players (to tune tier bands before Season 2)
SELECT (rating/100)*100 AS band, COUNT(*) FROM player_ratings WHERE rated_games>=5 GROUP BY band ORDER BY band;
-- Active cooldowns
SELECT user_id, strikes, datetime(until/1000,'unixepoch') FROM queue_penalties WHERE until > strftime('%s','now')*1000;
-- Pairs that hit the 3-games-a-day cap (possible rating farming)
SELECT player_a, player_b, COUNT(*) n FROM match_results WHERE queue='ranked' AND created > strftime('%s','now','-1 day')*1000 GROUP BY player_a, player_b HAVING n >= 3;
-- How Competitive matches end
SELECT end_type, COUNT(*) FROM match_results WHERE queue='ranked' GROUP BY end_type;
```

To clear a player's cooldown after a support request: `DELETE FROM queue_penalties WHERE user_id = ?`.

## Daily word and progress (Phase 4, November 2026)

Migration `drizzle/0015_daily_and_progress.sql` is additive: `daily_puzzles` (one word per date, chosen on first request), `daily_results`, `player_progress` and `player_ratings.season_tier`. Guest rows use the key `g:` plus the hashed device code and are removed after a year without play; account deletion removes the account's rows.

```sql
-- Daily players and solve rate, last 14 days
SELECT day, COUNT(*) AS players, ROUND(100.0*SUM(solved)/COUNT(*)) AS solved_pct FROM daily_results WHERE finished=1 GROUP BY day ORDER BY day DESC LIMIT 14;
-- Streak spread
SELECT streak, COUNT(*) FROM player_progress GROUP BY streak ORDER BY streak;
-- Best tier reached this season (for handing out Season 1 rewards)
SELECT season_tier, COUNT(*) FROM player_ratings WHERE season=1 GROUP BY season_tier;
```

## App, service worker and notifications (Phase 5, November 2026)

Migration `drizzle/0016_push_notifications.sql` adds `push_config` (the VAPID key pair, generated by the Worker on first use; each database has its own) and `push_subscriptions`. Do not delete the `vapid` row: every existing subscription is tied to its public key, and replacing it silently stops all notifications until players turn them on again.

- **Scheduled job:** `cloudflare.config.ts` registers an hourly trigger (minute 7) on both Workers; it sends the 19:00 streak reminders. Check it under the Worker's *Settings → Triggers* after deploying.
- **Service worker kill switch:** if `public/sw.js` ever causes trouble, replace its contents with
  ```js
  self.addEventListener('install',()=>self.skipWaiting());
  self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister().then(()=>self.clients.matchAll()).then(cs=>cs.forEach(c=>c.navigate(c.url)))));
  ```
  and publish; browsers fetch the new script on their next visit and remove the worker.
- **Android link:** `/.well-known/assetlinks.json` is served only when `ANDROID_PACKAGE` and `ANDROID_SHA256` are set on the Worker (see ANDROID.md).

```sql
-- Notification opt-ins
SELECT SUM(invites) AS invites, SUM(reminders) AS reminders, COUNT(*) AS devices FROM push_subscriptions;
```
