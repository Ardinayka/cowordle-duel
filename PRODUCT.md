# Lexivanto — current product contract

<!-- impeccable:product-schema 1 -->

Maintained by bully. Public browser beta at https://lexivanto.com. English only. This document supersedes historical design notes; it describes the implemented release, not future promises.

## Platform

web

## Users

Adults who already play daily word puzzles. They play on a phone, in a few spare minutes, often outdoors or one-handed. Some come to play a specific friend; others want a ranked opponent or a quick practice game.

## Positioning

Lexivanto turns the daily five-letter word puzzle into a live, fair two-player match. Duel (simultaneous hidden guesses, revealed together), Race and Co-op can be played against friends, in rated Competitive or unrated Normal queues, or against a bot. There are no ads and no paid advantages.

## Operating Context

A mobile browser is the main surface; desktop browsers are supported. Sessions are short and interrupted: an invitation can arrive mid-match, the phone can lose connection, and the player may switch apps. Phone apps are planned in REDESIGN-PLAN.md (installable web app, then a Google Play listing, then an App Store shell) but not built.

## Play

Home (the Play tab) offers four ways to play: Competitive (rated best-of-3 online Duel, sign-in required), Normal (online Duel, never rated, open to guests), Play a friend and Practise vs bot (both pick a game first; Word Swap is friends only). Bottom tabs: Play, Friends, Inbox, Ranks, Me. Guest names are editable; Google accounts can claim a unique username. Back returns to the previous setup step and confirms leaving an active match. Profile and Friends stay separate from game setup. No dropdowns, automatic bot substitution, paid advantages or advertising. Competitive and Normal are separate queues and never pair with each other. Only Competitive Duels are rated (Elo); every match shows whether it is rated (COMPETITIVE · RATED, NORMAL · NOT RATED, FRIEND GAME · NOT RATED, PRACTICE · NOT RATED). Guests who leave the name empty get an automatic name. The phone or browser Back button follows the in-game Back, including the leave confirmation in a match.

- Duel: both players lock a guess; neither can see the other's pending word. Both guesses reveal together. Normal uses a 30-second reply clock starting only after the first valid lock. Private Duel defaults untimed, with an optional response timer.
- Race: separate boards, unlimited guesses, no timer. The first correct server-accepted guess wins. Attempt count does not rank players.
- Co-op: alternate guesses on one board, with a friend or a bot partner. Friend games default untimed, with optional timer and six, ten or unlimited attempts.
- Bots: Easy / Medium / Hard. Always untimed. Bots reply within a few seconds (Easy 5–9 s, Medium 3.5–6.5 s, Hard 2–4 s). Bots use public clues and their own guess vocabulary, not the secret answer pool. No promised win rate.

English has 6,508 allowed guesses, 500 curated secret answers for friend and bot games, 2,015 secret answers for online games (kept on the server, never sent to browsers) and 2,254 bot words. Existing licence notices remain published. Portuguese source data and legacy room support are archived; the public client does not offer Portuguese or join Portuguese rooms.

## Competitive

- Format: best of 3 words. 45 seconds per guess; once one player locks, the other has 20 seconds. If only one player locks in time they win the word; if neither does, nobody does. First to 2 words wins; after 3 words the higher score wins, otherwise it is a draw. 3 seconds before word 1 and 4 seconds between words. No ready check and no rematch: the result offers Next match.
- Access: Google sign-in. A rule requiring 5 finished Normal games first is built but switched off while the player base is small (`UNLOCK_NORMAL_GAMES` in `server/ranking.js`).
- Matching: players within ±100 rating, widening by 100 every 15 s, anyone after 60 s; then the search offers Play Normal instead. Never a bot.
- Rating: Elo, start 1,000, floor 400. K 48 for the first 5 rated games (placements, shown as "Placement 2 of 5" with no number), then 32, 24 from 30 games, 16 at 1,400 or above. A settled player facing someone in placements risks half. The stakes (Win/Lose) are shown before word 1. Existing ratings were not recalculated.
- Tiers: Bronze (below 900), Silver 900, Gold 1,000, Platinum 1,100, Diamond 1,200, Master 1,300, with a 25-point buffer before demotion. Bands will be tuned from the real distribution.
- Fair play: at most 3 rated games per pair per day (further games are played but not rated, and say so). Leaving before the first guess makes the match void; leaving later is a loss. Either gives a strike: cooldowns of 5 minutes, 30 minutes, then 2 hours; strikes clear after 24 hours.
- Season 1 started with Phase 3 and runs about 3 months, with no reset. The leaderboard shows players with 5 or more rated games.
- Not yet built: solver-speed and tab-switch flags, the Friends leaderboard scope, season rewards and the soft reset.

## Multiplayer and identity

Server-owned D1 room state, revision checks and match generations protect concurrent actions and rematches. Rooms expire after 24 hours. Both players acknowledge online lobbies within 45 seconds; queue leases last 20 seconds. Separate retirement records fence old searches. Only players who polled the queue within the last 6 s are offered as opponents, so a closed tab stops being matchable almost at once. One verified account cannot pair against itself or maintain duplicate live waiting searches. An older match does not lock the account out of a new-device search.

Private hosts can change mode/timer in the same waiting or finished room. Both players must ready again. Invitation links remain for guests. A link does not reserve the free seat. Accepted friends can receive direct challenges lasting five minutes. A challenge appears as a banner above every screen and dialog with a live countdown, a short chime and vibration (when the player has turned those on) and one-tap Accept or Decline; Accept joins the room in place and marks the player ready. In a match the banner shrinks to a strip above the current word and cannot accept until the match ends. Hiding the banner keeps the challenge in the inbox; Decline answers it. The Inbox tab (and the top of Friends) lists: live invitations, friend requests, invitations missed in the last 7 days (with Challenge back) and the status of invitations you sent (sent, seen, accepted, declined, no answer). Any friend can be invited whether online, in a game or offline; it waits in their inbox. The lobby shows the sender what happened to the invitation. Signed-in clients sync friends and presence in one request every 6 s on menus and every 20 s during a match, paused while the tab is hidden. Incoming friend requests also show a banner, are listed first in Friends, and are counted on the Friends button.

Google sign-in gives a seven-day opaque account session, unique player tag, optional username, avatar and colour. Guests keep their preferences on the device. Signed-in appearance is saved when Done succeeds and appears to friends and future opponents. Friends search uses an exact username/tag, never a bulk directory. Requests require recipient consent. Accepted friends see recent availability.

Blocking is persistent, removes the friendship and outstanding invitations, and prevents future signed-in social contact, private joins and online matching between those accounts. It does not change the result of a current match. A guest/new account is a separate identity. Players can manage their blocks in Friends and report an opponent from the avatar card.

## Reliability and presentation

The word history scrolls independently of the current word and keyboard on normal-height phones. Tiles use a consistent grid before and after reveal. Very short or zoomed windows retain scrolling so controls remain reachable. Avatars and the logo use compact individual WebP files. Cache versioning applies only to matching asset versions. Light/dark themes, clue symbols and touch feedback remain; sound and vibration default off.

Room connection heartbeats write at most about once per 15 seconds per seat. After 35 seconds without a peer heartbeat the UI says reconnecting; after 90 seconds it says offline. This never extends deadlines or changes results. A player's own connection failure preserves the draft. Rate-limited polling pauses until retry time; cancellation/leaving has a separate server budget.

## Contact and scope

Help & feedback accepts bugs, ideas, player reports and privacy requests. Messages enter a private database queue, expire after 90 days, and are not automatically emailed. Operator review is manual; see OPERATIONS.md. Public privacy information describes actual storage and limitations. Full operator legal identity, trademark clearance, provider-region assurances and restore testing are not established by this release.

## Measurement

Aggregate daily counters and a one-way hashed device code (kept 60 days) measure return rates and invitation use. No third-party analytics, names, accounts or IP addresses. Queries are in OPERATIONS.md.

## Evidence on Hand

Real assets: the word lists and their licence notices, the avatar and logo WebP files, the redesign Figma file (https://www.figma.com/design/KeY08mZ8AcKEfxFJAHAido) and REDESIGN-PLAN.md (critique and roadmap). Usage figures exist only as the aggregate counters described in Measurement. There are no testimonials, reviews, press, player counts or win-rate claims; do not invent them.

## Product Principles

1. Fair first: every match says whether it is rated, and nothing can be bought that helps a player win.
2. The board and keyboard come first during play; nothing may cover or crowd them.
3. An invitation is never silently lost: it is visible wherever the player is, and missed ones stay in the inbox.
4. Expect interruptions: a guess typed offline is kept and sent on reconnect, and online matches resume after a reload.
5. Describe only what is built and measured; promises belong in the roadmap, not the product.

## Accessibility & Inclusion

WCAG 2.2 AA throughout; tile and key letters meet AAA contrast (7:1). Clues are shape-coded so they do not depend on colour. New controls are at least 48×48 CSS px (keyboard keys at least 44 px tall). Light and dark themes, 200% text size and reduced motion are supported. AGENTS.md lists the release checks.
