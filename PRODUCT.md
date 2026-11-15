# Lexivanto — current product contract

Maintained by bully. Public browser beta at https://lexivanto.com. English only. This document supersedes historical design notes; it describes the implemented release, not future promises.

## Play

Home presents three large mode buttons. Choose a mode, then Online, Friend or Bot. Guest names are editable; Google accounts can claim a unique username. Back returns to the previous setup step and confirms leaving an active match. Profile and Friends stay separate from game setup. No dropdowns, automatic bot substitution, rankings, paid advantages or advertising.

- Duel: both players lock a guess; neither can see the other's pending word. Both guesses reveal together. Online uses a 30-second reply clock starting only after the first valid lock. Private Duel defaults untimed, with an optional response timer.
- Race: separate boards, unlimited guesses, no timer. The first correct server-accepted guess wins. Attempt count does not rank players.
- Co-op: alternate guesses on one board. Online has a 30-second turn clock and six shared attempts. Private games default untimed, with optional timer and attempt settings.
- Bots: Easy / Medium / Hard. Always untimed. Bots use public clues and their own guess vocabulary, not the secret answer pool. No promised win rate.

English has 6,508 allowed guesses, 500 curated secret answers and 2,254 bot words. Existing licence notices remain published. Portuguese source data and legacy room support are archived; the public client does not offer Portuguese or join Portuguese rooms.

## Multiplayer and identity

Server-owned D1 room state, revision checks and match generations protect concurrent actions and rematches. Rooms expire after 24 hours. Both players acknowledge online lobbies within 45 seconds; queue leases last 20 seconds. Separate retirement records fence old searches. One verified account cannot pair against itself or maintain duplicate live waiting searches. An older match does not lock the account out of a new-device search.

Private hosts can change mode/timer in the same waiting or finished room. Both players must ready again. Invitation links remain for guests. A link does not reserve the free seat. Accepted friends can receive direct challenges lasting five minutes, shown in a dismissible banner and Friends.

Google sign-in gives a seven-day opaque account session, unique player tag, optional username, avatar and colour. Guests keep their preferences on the device. Signed-in appearance is saved when Done succeeds and appears to friends and future opponents. Friends search uses an exact username/tag, never a bulk directory. Requests require recipient consent. Accepted friends see recent availability.

Blocking is persistent, removes the friendship and outstanding invitations, and prevents future signed-in social contact, private joins and online matching between those accounts. It does not change the result of a current match. A guest/new account is a separate identity. Players can manage their blocks in Friends and report an opponent from the avatar card.

## Reliability and presentation

The word history scrolls independently of the current word and keyboard on normal-height phones. Tiles use a consistent grid before and after reveal. Very short or zoomed windows retain scrolling so controls remain reachable. Avatars and the logo use compact individual WebP files. Cache versioning applies only to matching asset versions. Light/dark themes, clue symbols and touch feedback remain; sound and vibration default off.

Room connection heartbeats write at most about once per 15 seconds per seat. After 35 seconds without a peer heartbeat the UI says reconnecting; after 90 seconds it says offline. This never extends deadlines or changes results. A player's own connection failure preserves the draft. Rate-limited polling pauses until retry time; cancellation/leaving has a separate server budget.

## Contact and scope

Help & feedback accepts bugs, ideas, player reports and privacy requests. Messages enter a private database queue, expire after 90 days, and are not automatically emailed. Operator review is manual; see OPERATIONS.md. Public privacy information describes actual storage and limitations. Full operator legal identity, trademark clearance, provider-region assurances and restore testing are not established by this release.
