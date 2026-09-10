# Lexivanto · working beta brand

Playable bilingual word-game app for Gonçalo Garrett. Mode menu: locked-round Duel, Race, Co-op. Each runs against a practice bot or in a two-person friend room. Custom clocks (off/15/30/60/120 seconds per round or turn; off/1/5/10 minutes per race). Duel defaults to 30-second sudden death from round 7, unlimited rounds. Race: fewer guesses wins, solving time tiebreak. Co-op: alternate, 6/10/unlimited shared attempts, timeout ends team game.

Friend rooms are server-authoritative in D1, expire after 24 hours, require bearer player-seat credentials and site access. Created room settings freeze; both players ready before start/rematch. No spectator mode, ranked matchmaking, or global stats. Practice wins/played last for this visit. Current hosting audience remains owner-only until the user changes site access.

English and PT-PT dictionaries remain curated previews. Portuguese input strips accents and normalizes Ç to C. Five-letter words only. Other game concepts remain outside this release.


Beta release: guest play is primary. Optional Google ID-token sign-in provides an account display name, seven-day opaque sessions, logout, and profile deletion. It does not migrate guest rooms or practice results into account history. GOOGLE_CLIENT_ID must be configured before the provider control is enabled. Google is independent of the outer hosting audience.

Bots default to Easy. Easy/Normal can overlook deductions; Expert filters every public clue. All draw from the valid-guess list, never the restricted answer list. Thinking time differs by difficulty. No win-rate guarantee; friend-beta feedback should calibrate these levels.

Language, nickname, opponent, and per-mode clock/difficulty settings persist in localStorage. Match seat credentials remain scoped to the tab. Do not automatically change a nickname while the user is typing.


## Focused play flow (current)

Home shows three large stacked buttons: Duel, Race, Co-op. Mode selection opens guest nickname plus Online / Friend / Bot. Signed-in users use their Google display name. No dropdowns. Profile lives in a header dialog, separate from choosing a game. Back preserves setup values; Menu returns to the three-mode list and confirms leaving active games.

Bot: Easy / Medium / Hard buttons start practice directly. All bot modes are untimed, irrespective of saved friend clocks. Internal keys remain easy/normal/expert.

Friend: create an invitation link or join by code. Timing and Co-op attempts are optional expanded chip controls. No saved friends/address book is claimed. Incoming invitations bypass the mode flow, preview fixed room rules, and join after entering a name. Active rooms must be left before joining another invitation.

Online: immediate real matchmaking by mode and language, no automated opponent substitution. Fixed presets: Duel 30-second sudden death after round 6, Race five minutes, Co-op 60 seconds/turn and six attempts. Both clients acknowledge a match before starting; unacknowledged lobbies end after 45 seconds. Waiting queue leases last 20 seconds and refresh on polling. Per-search retirement records stop stale cancelled/completed requests from restarting a queue.

The Site is now public and GOOGLE_CLIENT_ID is configured. Google console settings still belong to the owner. No domain migration is included.


## Response Duel and readability update

New timed Duel games use a response clock: first valid lock starts the other player's selected response duration (default30 seconds). No clock runs while both are still choosing; both-wrong reveal resets it. Missing the response deadline loses the match. Existing stored round-clock rooms keep their old rules. Bots remain untimed. Online timing is selectable before search and forms part of the matching bucket together with mode/language; Race retains overall time and Co-op per-turn time.

English allowed guesses expand from2,254 to6,508 using licensed SCOWL generic/US/UK words, filtered to lowercase five letters. Answers remain50 curated words. Bot guess vocabulary remains the previous curated set so expansion does not introduce obscure bot guesses. Full licence and modified-subset notice are served at wordlist-license.html. PT-PT remains unchanged.

Light/dark theme control persists on the device. Exact teal, present amber and absent slate use independent symbols and contrast-checked text. On normal-height phone screens, the play surface uses dynamic viewport height: history has one scroll region, current word and keyboard remain outside it. Very short/zoomed windows deliberately retain page scrolling rather than clip controls. Physical outdoor readability still needs user-device validation.

## Navigation and QA release — September 10, 2026
- Online matchmaking uses fixed 30-second timing; users choose timing only in private friend rooms. Duel starts the reply countdown on first lock; Race uses match time and Co-op turn time. Practice remains untimed.
- Navigation names destinations: Game modes / Change opponent. Playing shows Leave match or End practice, including on phones, with a contextual confirmation.
- Search shows elapsed time, mode/language/rules, cancellation feedback and an explicit switch to bot practice.
- Room mutations require the expected match generation. Departure is recorded even after a result, prevents rematch, and a new search declines an unaccepted old rematch.
- QA: 720 engine simulations by a review agent; automated suite expanded to 46 checks; browser guest matching, first-lock feedback, cancellation-to-practice, submission and exit reviewed. Phone layout checked in a 390 x 700 embedded viewport, not on physical hardware. Google interactive sign-in was not exercised in this local preview.
