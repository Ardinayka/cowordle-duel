# Lexivanto — current product contract

Maintained by bully. Public browser beta at https://lexivanto.com. English only. This document supersedes historical design notes; it describes the implemented release, not future promises.

## Play

Home presents four large mode buttons. Choose a mode, then Online, Friend or Bot. Guest names are editable; Google accounts can claim a unique username. Back returns to the previous setup step and confirms leaving an active match. Profile and Friends stay separate from game setup. No dropdowns, automatic bot substitution, paid advantages or advertising. Online Duels between two signed-in players are rated (Elo); every match shows whether it is rated (Rated Duel, Online · not rated, Friend game · not rated, Practice · not rated). Guests who leave the name empty get an automatic name. The phone or browser Back button follows the in-game Back, including the leave confirmation in a match.

- Duel: both players lock a guess; neither can see the other's pending word. Both guesses reveal together. Online uses a 30-second reply clock starting only after the first valid lock. Private Duel defaults untimed, with an optional response timer.
- Race: separate boards, unlimited guesses, no timer. The first correct server-accepted guess wins. Attempt count does not rank players.
- Co-op: alternate guesses on one board. Online has a 30-second turn clock and six shared attempts. Private games default untimed, with optional timer and attempt settings.
- Bots: Easy / Medium / Hard. Always untimed. Bots reply within a few seconds (Easy 5–9 s, Medium 3.5–6.5 s, Hard 2–4 s). Bots use public clues and their own guess vocabulary, not the secret answer pool. No promised win rate.

English has 6,508 allowed guesses, 500 curated secret answers and 2,254 bot words. Existing licence notices remain published. Portuguese source data and legacy room support are archived; the public client does not offer Portuguese or join Portuguese rooms.

## Multiplayer and identity

Server-owned D1 room state, revision checks and match generations protect concurrent actions and rematches. Rooms expire after 24 hours. Both players acknowledge online lobbies within 45 seconds; queue leases last 20 seconds. Separate retirement records fence old searches. Only players who polled the queue within the last 6 s are offered as opponents, so a closed tab stops being matchable almost at once. One verified account cannot pair against itself or maintain duplicate live waiting searches. An older match does not lock the account out of a new-device search.

Private hosts can change mode/timer in the same waiting or finished room. Both players must ready again. Invitation links remain for guests. A link does not reserve the free seat. Accepted friends can receive direct challenges lasting five minutes. A challenge appears as a banner above every screen and dialog with a live countdown, a short chime and vibration (when the player has turned those on) and one-tap Accept or Decline; Accept joins the room in place and marks the player ready. In a match the banner shrinks to a strip above the current word and cannot accept until the match ends. Hiding the banner keeps the challenge in the inbox; Decline answers it. The Friends dialog opens with an inbox: live invitations, friend requests, invitations missed in the last 7 days (with Challenge back) and the status of invitations you sent (sent, seen, accepted, declined, no answer). Any friend can be invited whether online, in a game or offline; it waits in their inbox. The lobby shows the sender what happened to the invitation. Signed-in clients sync friends and presence in one request every 6 s on menus and every 20 s during a match, paused while the tab is hidden. Incoming friend requests also show a banner, are listed first in Friends, and are counted on the Friends button.

Google sign-in gives a seven-day opaque account session, unique player tag, optional username, avatar and colour. Guests keep their preferences on the device. Signed-in appearance is saved when Done succeeds and appears to friends and future opponents. Friends search uses an exact username/tag, never a bulk directory. Requests require recipient consent. Accepted friends see recent availability.

Blocking is persistent, removes the friendship and outstanding invitations, and prevents future signed-in social contact, private joins and online matching between those accounts. It does not change the result of a current match. A guest/new account is a separate identity. Players can manage their blocks in Friends and report an opponent from the avatar card.

## Reliability and presentation

The word history scrolls independently of the current word and keyboard on normal-height phones. Tiles use a consistent grid before and after reveal. Very short or zoomed windows retain scrolling so controls remain reachable. Avatars and the logo use compact individual WebP files. Cache versioning applies only to matching asset versions. Light/dark themes, clue symbols and touch feedback remain; sound and vibration default off.

Room connection heartbeats write at most about once per 15 seconds per seat. After 35 seconds without a peer heartbeat the UI says reconnecting; after 90 seconds it says offline. This never extends deadlines or changes results. A player's own connection failure preserves the draft. Rate-limited polling pauses until retry time; cancellation/leaving has a separate server budget.

## Contact and scope

Help & feedback accepts bugs, ideas, player reports and privacy requests. Messages enter a private database queue, expire after 90 days, and are not automatically emailed. Operator review is manual; see OPERATIONS.md. Public privacy information describes actual storage and limitations. Full operator legal identity, trademark clearance, provider-region assurances and restore testing are not established by this release.

## Measurement

Aggregate daily counters and a one-way hashed device code (kept 60 days) measure return rates and invitation use. No third-party analytics, names, accounts or IP addresses. Queries are in OPERATIONS.md.
