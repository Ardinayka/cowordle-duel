# Lexivanto — critique, redesign and roadmap

Lead game designer's report, 15 November 2026. Nothing in the code, the databases or your existing Figma file was changed. Seven senior specialists reviewed independently (UX, UI, accessibility, competitive systems, retention, mobile engineering, playtest/QA); this document merges their findings and records where I overruled one of them.

**New Figma file:** https://www.figma.com/design/KeY08mZ8AcKEfxFJAHAido

Evidence labels used below: **SEEN** = observed in a real browser on the preview at phone size; **CODE** = read in the code only; **SIM** = real element force-rendered because the state could not be reached. Google sign-in is switched off on the preview, so every signed-in screen (friends list, real invitations, rated results) is CODE or SIM, never SEEN.

---

## 1. Prioritised problems

| # | What's wrong | Why it matters | Evidence · confidence | Fix |
|---|---|---|---|---|
| 1 | **Invitations and friend requests are close to invisible.** The only delivery is a 20-second poll that runs when you are signed in and the tab is visible. A game invitation shows a banner with no sound, vibration or countdown; it sits behind any open dialog and cannot be tapped there; in a match it covers the top of the board and Accept is disabled. Dismissing it deletes it for good. A friend request gets no banner at all, only a 22px badge on the Profile button, and its row is listed below all your friends. Accepting an invitation takes 4 taps and a page reload. You can only invite a friend who is idle on a menu. The sender only ever sees "Invitation sent… waiting". | This is your Problem 1 and it is structural: with the tab in the background or the site closed, nothing can reach you inside the 5 minutes. | CODE + SIM · high | Inbox tab with badge, banner above every layer with chime, haptic and countdown, one-tap Accept that joins in place, missed invitations kept with "Challenge back", sender status, then web push and app push. Section 3A. |
| 2 | **"Ranked" is printed on the game, not on the match.** The Duel card says ONLINE · RANKED even when you then pick a bot or a friend. The play screen carries a fixed line "Custom matches are unrated" even in rated games. Guests share the ranked queue; a signed-in player paired with a guest silently gets a "Casual Duel" and learns it on the result line. | Players cannot tell what is at stake. Your Problem 2. | SEEN (card, note) + CODE · high | Split into Competitive and Normal as the first choice; one chip on every screen says which. Section 3B. |
| 3 | **An empty queue is a dead end.** Search never ends, never widens, gives no estimate ("Still searching…" unchanged at 62 s). Rating is not used for matching at all. Backgrounding the tab drops you from the queue (20 s lease, polling stops). | For a small community this is the most likely reason a new player leaves and does not return. | SEEN + CODE · high | Honest search screen, rating window that widens, choices at 60 s, labelled bot offer in Normal only, search that survives backgrounding. |
| 4 | **The ladder is easy to distort.** Flat K=32, no real placement, every rematch fully rated (two friends can farm), the exact 500 answers ship to the browser in `words-en.json`, the 45 s ready check lets players dodge for free, the 30 s clock only starts after the first lock so two idle players stall forever, and one timeout loses the whole match. A simulation suggests about two thirds of single-word Duels end with both players solving in the same round, so lock speed decides. | "Fair and hard to cheat" is not true yet. Good news: the answer, the opponent's pending guess and the clocks never reach the client early, and results cannot be forged. | CODE · high (simulation: indicative) | Section 3B: placements, K schedule, rating-window matching, same-pair caps, leaver strikes, best-of-3, server-only answer pool. |
| 5 | **First visit does not explain or start the game.** Home says "Choose your game" with four cards and no Play button; a typed name is required before anything starts; the Easy bot appears to wait 18–28 s per guess, so a first win takes minutes. | The first 10 seconds decide whether a visitor becomes a player. | SEEN (home, name wall) + CODE (bot delay, medium) | Welcome screen with one "Play now", auto guest name, 60-second tutorial against a fast bot, sign-in offered after the first win. |
| 6 | **The game does not feel like a game.** No tile flip (the CSS exists but is never triggered), no shake on an invalid word (the error appears below the keyboard and shifts the layout 27px), the win and loss screens are identical, sound and vibration default off. | Feedback is what makes a word game satisfying and a timed mode tense. | SEEN · high | Motion and sound spec in the Figma file (20 moments, each with a reduced-motion alternative). |
| 7 | **Accessibility fails where it matters most.** Light theme: RANKED badge 2.8:1, trophy icon 1.6:1, control borders 1.5–1.95:1. Dark theme: correct and present tiles have identical brightness (1.03:1), told apart only by 12px marks. Letter keys are 32–36px wide (25–29px at 320px). At 320×568 the Enter/Delete row is off-screen. A screen reader never announces your own guess result, the timer gives no 10 s / 5 s warning, and invitations are silent. 28 text styles are under 14px. | Colour-blind, low-vision and screen-reader players cannot play reliably; sunlight washes out the light theme. | SEEN, measured · high | New tokens (every tile letter ≥7:1), shape-coded tiles, 48px targets, announcements, checks at 320px in both themes. |
| 8 | **Nothing brings a player back.** No daily challenge, streak, achievements or sharing. Match history, win/loss record and XP are stored but never shown; XP unlocks nothing. There are no analytics, so retention cannot be measured. | A multiplayer game with few players online needs something to do alone. | CODE + SEEN · high | Daily Duel, streaks, stats and history, levels, share card, minimal first-party analytics. |
| 9 | **Navigation behaves like a website.** The Friends button disappears after the home screen, Profile is disabled during search, profile/friends/leaderboard are long centred dialogs, the lobby is two screens tall, and the phone's Back button leaves the site, even mid-match. | Players lose their place; Android users lose matches. | SEEN + CODE · high | Bottom navigation (Play, Friends, Inbox, Ranks, Me), real screens, history handling. |
| 10 | **The visual system has drifted.** 123 colours (32 near-identical navies), 57 font sizes, 16 radii across three stylesheets that override each other; weights requested that are not loaded; a light-grey keyboard inside the dark theme; a 270px empty band on the play screen; the logo is a 384px image; four different illustration styles. The existing Figma file mirrors the code, so it inherits all of it. | Explains the "slightly different colours" you noticed, and makes every change risky. | CODE + SEEN · high | One token set, 40 components, rebuilt view layer. |
| 11 | **Not installable, and fragile as an app.** No manifest, icons or service worker; the match seat is stored per tab, so a killed app forfeits; sessions end after 7 days. | Blocks the phone app and push. | CODE + curl · high | Section 5. |
| 12 | **Small bugs and stale text.** A Word Swap invitation is labelled "Duel"; a lobby nobody readies still pays 15 XP; the leave dialog says "three game modes" (there are four); PRODUCT.md says "no rankings" and "English only" while Portuguese is half-present (switching would print "undefined"); the privacy page still mentions the old host. | Trust. | CODE + SEEN · high | Quick wins, Phase 0. |
| 13 | **Launch gates still open.** Player reports alert nobody, usernames are unfiltered, no published contact, operator identity and terms unresolved. | Required by both app stores. | CODE · high | Owner tasks; start early (longest lead time). |
| 14 | **Ghost opponents online.** A player who closes the tab stays matchable for up to 20 s; the playtest got "Alice vs Alice" and then a zero-guess draw while a real second player kept searching. | A broken first online match is the worst possible first impression. | SEEN once, cause in `server/matchmaking.js` · medium | Phase 1: release the queue entry on page hide, require a fresh heartbeat before pairing. |
| 15 | **A friend who joins by link cannot see "I'm ready".** It sits at y=847 in an 844px screen; the only visible button is "Copy invitation link". | Friend games stall at the lobby. | SEEN · high | Phase 0 makes Accept-from-invitation auto-ready; the lobby rebuild in Phase 2 fixes link joins. |
| 16 | **Keyboard bottom row off-screen on short phones** (46–66px at 375×553, 360×560, 320×568). Error text under the keyboard shifts it a further 28–46px. | Enter and Delete unreachable without scrolling on small phones. | SEEN · high | Phase 2 layout (board history scrolls, keyboard pinned). |
| 17 | **Rematch moves the other player silently** from the result to the lobby; offline players see a raw "Failed to fetch"; the opponent sees nothing for 35 s. Word Swap's "Give up" forfeits on one tap. | Confusing and occasionally unfair. | SEEN · high | Phase 1–2: rematch request message, plain connection states, confirm on give-up. |

What is good and should be kept: the server-authoritative rules engine and its tests, the honest "never a silent bot" rule, the simultaneous-reveal Duel (a real original idea), the name and logo, block/report, and reduced-motion and focus handling that already pass.

---

## 2. The new Figma file

https://www.figma.com/design/KeY08mZ8AcKEfxFJAHAido — "Lexivanto — Redesign 2027" (in your Events team drafts, the only team with a full seat and theme modes).

| Page | What is on it |
|---|---|
| Cover & Guide | Summary and this page list |
| Foundations | Colour tokens for dark and light as Figma variables with two modes, computed contrast table (all pass), the tile shape language, type scale, spacing and radius |
| Components | 40 components and 50 icons, states as variants (default, pressed, focused, disabled, loading, error where they apply) |
| 01 First visit & Home | 6 screens |
| 02 Play setup, Search, Lobby | 11 screens |
| 03 Gameplay & Results | 16 screens |
| 04 Invitations, Friends, Inbox | 11 screens and a delivery flow diagram |
| 05 Profile, Ranks, Settings, States | 12 screens |
| 06 Light theme & 320px checks | 12 light screens, 5 screens at 320×568 |
| 07 Tablet & Desktop | 768 and 1366 layouts for home and Duel |
| Motion & Sound | 20 moments: movement, timing, sound, vibration, reduced-motion alternative |
| Rule changes to approve | 14 existing rules the redesign would change, with reasons |
| _build | Helper scripts I used to generate the file; not design, safe to delete |

Design decisions worth knowing:
- **Tiles are coded by shape first.** Correct = solid square with a tick. Right letter, wrong place = a circle. Not in the word = flat and dim. Keys repeat it. This survives colour-blindness, greyscale and glare; in light theme the fills also differ in brightness by about 4:1.
- **The main action is no longer cyan.** The UI designer showed that Enter looked like a confirmed letter. Primary buttons are near-white in dark theme and ink in light theme; cyan/teal belongs to correct tiles.
- **Type:** Lexend for headings, tiles and numbers, Inter for reading. Smallest text 12px (capital labels only).
- **Limits of the file:** avatars and the logo are placeholders for your production artwork; rating numbers and tier bands shown are illustrative; components are real and variable-bound, but screens were composed by script and checked by screenshot, not hand-polished pixel by pixel.

---

## 3A. Invitations and friend requests, screen by screen (page 04)

How one arrives today (traced in code): sender taps Challenge → a row with a 5-minute expiry → your client finds it on its next 20 s poll, if signed in and the tab is visible → banner "X invited you" with View invitation / Dismiss → View opens the Friends dialog → a second View invitation accepts and reloads the page → Join room → I'm ready. On another screen: same banner, hidden behind dialogs. In a match: covers the board, Accept disabled. Tab in background or site closed: nothing. Friend request: badge only.

Proposed:

| Screen | What you see and do |
|---|---|
| 1.5 Invitation arrives (any screen) | A card slides down over everything, dialogs included, with a two-note chime and double vibration: who, which game, "not rated", a countdown and draining bar. **Accept** and **Decline** are one tap each. |
| 4.5 After Accept | You are in the room at once. No Friends dialog, no reload, no Join, no Ready. Both count as ready; 3-2-1 starts. |
| 4.4 During a match | The banner shrinks to a pill in the empty band between history and your draft row, never over tiles, keyboard or clock. "Play after" queues the accept; the sender sees "will join after her game". No sound in Competitive. |
| 4.3 Friend request | Gets a banner too. It does not block; after 8 s it folds into the Inbox, and the badges stay until you answer. |
| 4.1 Friends tab | Requests pinned to the top with Accept / Decline. Every friend has an action whatever their status; a busy or offline friend receives the invitation in their Inbox. |
| 4.6 Inbox tab | Everything that needs an answer, newest first, answerable in place. Live invitations show their countdown. The tab carries the unread count. |
| 4.7 Missed invitation | Nothing is silently deleted. After 5 minutes it becomes "You missed Maya's invitation" with **Challenge back**. |
| 4.9 Sender status | Sent → Seen → Joined / Declined / No answer, with the same countdown. |
| 4.10 Push (app, and web where allowed) | "Maya invited you to a Duel · 5 minutes to join" with Accept / Decline; Accept opens the room directly. |
| 4.11 Permission | Asked once, in context, right after you send your first invitation, with a plain reason. |

Disagreement resolved: UX proposed four tabs with the Inbox inside Friends; I chose five tabs with a dedicated Inbox in the centre, because missed invitations are the problem you raised first and a badge in thumb reach is the cheapest insurance. UX also proposed extending invitations to 30 minutes; I kept your 5-minute live window (it matches "play now") and added the missed-invitation trail instead.

## 3B. Competitive vs Normal, screen by screen (pages 01–03)

What the code does today: plain Elo, K=32, start 1000, draws 0.5, no floor or seasons; "provisional under 10 games" is a label only. Only public-queue Duel between two different signed-in accounts is rated. Friend and bot games write nothing. XP is 20/15/10 per online Duel and unlocks nothing. Matchmaking is first-come-first-served.

| Decision | Proposal | Why |
|---|---|---|
| Which games are ranked | **Duel only**, one rating. Race, Co-op and Word Swap stay in Normal and Friend. | Race with unlimited guesses and no clock rewards guess-spamming; Co-op has no opponent; Word Swap depends on obscure words. One ladder also keeps a small community in one queue. Revisit Race later with a guess cap. |
| Ranked format | Best of 3 words; 45 s per guess for both players, 20 s once the opponent locks; a timeout loses the word. | Cuts the luck of a single word and stops idle stalls. **This changes game rules, so it needs your approval.** |
| Rating system | Stay on Elo (the tables and tests already fit); do not move to Glicko-2. K 48 during 5 placement games, then 32, 24, and 16 above 1400; opponents of a placement player risk half. Start 1000, floor 400. Existing ratings are kept untouched. | Simple to explain ("like chess"), safe to migrate. Glicko's benefits mostly matter at larger scale. |
| Tiers | Bronze, Silver, Gold, Platinum, Diamond, Master, pure rating bands with a 25-point demotion buffer. Start with 100-point bands and tune from the real distribution before Season 1. (The Figma figures are illustrative.) | Goals between the numbers; no promotion series to engineer. |
| Matchmaking | Competitive: ±100 rating, widening every 15 s to anyone at 60 s; then you choose Keep waiting / Play Normal / Notify me. **Never a bot, never a fake opponent.** No ready check, no rematch. Normal: anyone; after 20 s a clearly labelled bot is offered while the search continues. | Honest for a small population. |
| Leaving | Forfeit = loss with full rating change; leaving in the first seconds before any guess = no contest; strikes give queue cooldowns of 5 min, 30 min, 2 h. Server clocks. | Standard, proportionate. |
| Anti-cheat | Sign-in required, 5 Normal games to unlock Competitive, at most 3 rated games per pair per day, answer pool grown to 2,000+ and kept on the server, solver-speed and tab-switch flags for manual review (no automatic bans), report flow. | Honest limit: a solver cannot be fully prevented in any word game; simultaneous reveal plus a short clock makes it pay less. |
| Seasons | About 3 months, soft reset halfway to 1000, cosmetic rewards only, leaderboard scopes Global / Friends / All time, 5 games to appear. | |

Screens: **1.3/1.4 Home** shows four full-width cards in two groups: Competitive and Normal (online), Play a friend and Practice vs bot (private). Each says "Rated" or "Not rated" in words; Competitive is visible but locked for guests with the reason. **2.1** Competitive hub: your tier, rating, season, and the rules in four lines before you commit. **2.2** placements: "2 of 5", no number shown yet. **2.3** searching: real elapsed time and the rating window in words. **2.4** quiet queue at 60 s with the three choices. **2.5** match found: both ratings and "Win +17 · Lose −15" before the first letter. **2.6/2.7** Normal: pick any game; bot offer at 20 s. **3.1–3.5** Duel with the mode chip in the header throughout. **3.9** leaving a ranked match states the cost on the button. **3.11/3.12** result: rating before → after, signed and arrowed change, tier progress, XP, "Next match". **3.13** placement result. **3.14/3.15** friend and Normal results show "Not rated" where the rating would be. **3.16** promotion moment. **5.3/5.4** leaderboard and tiers explained.

Disagreement resolved: UX proposed one "Play online" button with a Normal | Competitive switch. I chose two separate cards: a switch hides what is at stake behind a control state, and four cards keep your approved stacked-card layout.

## 3C. The rest of the critique in brief

- **Compared with successful games.** Borrow: Wordle's flip cadence, streak and spoiler-free share grid; Chess.com's rating graph, daily puzzle and clear rated/unrated split; Duolingo's streak with a humane freeze; Clash Royale's short, loud win moments; Words With Friends' "nudge" and asynchronous play. Avoid: coin and booster clutter, photo backgrounds behind text, energy timers, loot boxes, fake "players" in queues, and guilt-trip notifications.
- **English and Portuguese.** Today the game is English only; Portuguese is leftover and broken. A proper PT-PT / PT-BR release needs externalised strings, about 30% text expansion (the designs leave room), Ç and accent handling on tiles and keyboard, a reviewed Portuguese answer list, and the page language set for screen readers. I recommend it as its own project after the redesign.

---

## 4. Roadmap, with code, database and risk per phase

Effort assumes one developer with AI assistance. Everything goes to the preview (`cloudflare-live`) first; nothing reaches `main` until you say "publish".

**Phase 0 — Quick wins (about 1 week). No database change.**
- Status (15 Nov 2026): approved and built on the preview (`cloudflare-live`); waiting for the owner's review before publishing. Browser-Back handling, auto guest names, faster bots, and the cancelled-lobby XP fix are included.
- Code: per-match Competitive/Normal chip and removal of the fixed "unrated" note; friend requests pinned to the top and the badge moved to Friends; banner above dialogs with chime, vibration and countdown; one-tap Accept that joins in place; fix the Word Swap label, the cancelled-lobby XP, "three game modes"; auto guest name; faster Easy bot; switch on the tile flip and invalid shake that the CSS already contains; light-theme contrast fixes; browser Back handling.
- Risk: low. Header and banner changes need the AGENTS.md browser checks at 320/390/768/1366.

**Phase 1 — Inbox and measurement (2–3 weeks).**
- Database (additive): new `notifications` table; `friend_challenges` gains `status`, `created`, `seen_at`, `responded_at` and stops being deleted on dismiss; a small `events` table for first-party analytics.
- Code: one `/api/inbox` call replacing two polls (every 5 s while visible), Inbox screen, missed invitations, sender status, invitations to any friend.
- Risk: low-medium. Invitations in flight at deploy must still resolve; changing the invitation id shape needs the friends tests extended first.

**Phase 2 — New interface (3–4 weeks, the largest visual change).**
- Code: rebuild the view layer only (rules engine and server untouched) on the new tokens and components; bottom navigation; new home, setup, play and result screens; motion and sound; installable web app (manifest, icons, service worker); web push with a `push_tokens` table.
- Risk: medium. Interface tests are bound to element ids and will need rewriting; a service worker can strand players on an old version, so it ships with a kill switch; this is where the 14 rule changes take effect, so I need your approval of that page first.

**Phase 3 — Competitive and Normal (3–4 weeks, in four flagged steps).**
- Status (16 Nov 2026): built on the preview. Step 1 shipped with Phase 2. Steps 2–4 are built: rating window, K schedule, placements, floor, pair cap, unlock after 5 Normal games (built, switched off until queues are busy), leaver strikes, best of 3 with a 45 s clock, a 2,015-word server-only answer pool, tiers and Season 1 (no reset). Migration 0014 adds the columns and the `seasons` and `queue_penalties` tables. Not built yet: `guess_telemetry` and `player_flags` (solver-speed and tab-switch review), "Notify me" (needs push), the Friends leaderboard scope and season rewards. The Normal bot offer is the existing "Practice with a bot instead" button, which ends the search rather than running alongside it.
- Database (additive): `match_queue` gains `queue`, `user_id`, `rating`; `match_results` gains `queue`, `season`, scores, `end_type`; `player_ratings` gains `peak_rating`, `season`, `season_games`; new `seasons`, `season_results`, `queue_penalties`, `guess_telemetry`, `player_flags`.
- Steps: (1) queue split and wording, no formula change; (2) rating-window matching, K schedule, placements, pair caps, strikes; (3) best-of-3, larger server-only answer pool; (4) tiers, new result screens, Season 1 with no reset.
- Risk to ratings: the settlement query is the most delicate code in the project. Before step 2 goes live, replay every stored rating event through the new code and confirm no existing rating changes. Nobody's rating is reset. Check for farmed pairs before attaching rewards. Guests lose a "ranked" card that never rated them.

**Phase 4 — Reasons to return (2–3 weeks).**
- Status (16 Nov 2026): built on the preview with the owner's choices (solo daily word with 6 guesses, new word at each player's local midnight, all seven parts). Daily word (#1 is 16 Nov 2026), streak with freezes, share grid, stats and levels in Me, six free reactions with mute, season-rewards preview with the best tier recorded per season, first-visit welcome note and tips in the first game (changed on the owner's feedback: no forced bot game, and guests invite friends by link without sign-in prompts), and bot games that survive a reload. Migration 0015 adds `daily_puzzles`, `daily_results`, `player_progress` and `player_ratings.season_tier`. Not built: achievements, the puzzle archive (planned for the supporter pass), push reminders for the streak.
- Database: `daily_puzzles`, `daily_results`, `player_progress` (streaks, level), later `player_achievements`.
- Code: Daily Duel, streak with an earned freeze, stats and history screens (the data already exists), levels from XP, share card.
- Risk: low; additive.

**Phase 5a — Installable app and notifications (built 16 Nov 2026 on the preview).** Manifest and icons, service worker with an offline page and a kill switch, Install button and iPhone instructions in Me, opt-in push notifications (friend invitations; 19:00 streak reminder from an hourly scheduled job) with no content through push services and a VAPID key generated per database, `/.well-known/assetlinks.json` for the Android app, ANDROID.md with the Play listing steps and texts, and a hidden support-link slot. Migration 0016 adds `push_config` and `push_subscriptions`. Not verified: delivery to real phones (needs a device), the Play build and review (needs the owner's account).

**Phase 6 — Turn-based friend games (built 16 Nov 2026 on the preview).** Duel and Co-op between signed-in friends, 3 days per move, Your games list on Play, account-bound seats, your-turn notifications, Back keeps the game open, resign in the leave dialog. Migration 0017 adds `room_members`. Section 8 called this out as the next product priority after the daily word.

**Phase 5 — Phone app (10–12 engineer-weeks across 14–16 calendar weeks, overlapping Phases 2–4).** Section 5.

Roughly five to six months end to end for one developer.

---

## 5. Path to iPhone and Android

**Recommendation: installable web app first, then a Trusted Web Activity on Google Play, then a Capacitor shell on the App Store. No rewrite.**

| Option | Effort | Push | Verdict |
|---|---|---|---|
| Installable web app only | 2–3 weeks | Good on Android; on iPhone only after "Add to Home Screen" | Needed anyway, not enough alone |
| Capacitor wrapper on both | 9–11 weeks | Full | Works, but redoes sign-in on Android for no gain |
| **Web app + Play listing that runs it + Capacitor on iPhone** | **10–12 weeks total** | Good on Android, full on iPhone | **Recommended** |
| React Native / Flutter rewrite | 20–28 weeks | Full | Discards the tested rules engine; two interfaces to maintain |
| Fully native | 35–50 weeks | Full | Not justified for a turn-based word game |

- **Cost:** Apple US$99 a year, Google US$25 once, Cloudflare paid plan about US$60 a year: about US$185 in year one, about US$160 a year after, plus a Mac if you have none. The polling design uses roughly 80 requests per match-minute, so the free Cloudflare plan tops out near 250 matches a day (estimate from code, not measured).
- **Store requirements checked on 15 Nov 2026:** Google still requires new personal accounts to run a closed test with 12 testers for 14 days; Apple rejects thin website wrappers (guideline 4.2), so the app must feel native (the redesign, haptics, push, offline screen); Sign in with Apple is required next to Google (4.8); account deletion in the app (already exists); report, block, username filter and a published contact (1.2); privacy labels and age rating on both stores. Store commission of 15% would apply only if you later sell cosmetics.
- **What must change in the code first, in order:** serve manifest and icon files (the build cannot today); manifest, icons, service worker; safe-area layout; keep the match seat across restarts; inbox and web push; a scheduled cleanup job; a light live connection so invitations arrive in about a second; an API mode for native clients (allowed origins, longer sessions); a provider-neutral identity table so Apple and Google can link to one account; the iPhone shell with native haptics and push; offline screen; version gate ("update required"); crash reporting.
- **Biggest risks:** (1) the identity migration touches every account, so it is done as copy-then-switch after a tested database backup and restore, which is also still an open launch gate; (2) mis-linked Apple and Google sign-ins would split a player's rating and friends; (3) store listings and EU rules will make the operator's legal identity public, and the project currently uses an alias — **this is your decision and has the longest lead time.**
- Not verified: direct push delivery to Apple from a Cloudflare Worker (needs a short technical trial), action buttons on iPhone web push, and current availability of home-screen web apps in the EU.

---

## 6. What I need from you

1. Approve, change or reject the 14 lines on the Figma page "Rule changes to approve" (bottom navigation, 48px targets with the keyboard exception, the four cards becoming ways to play, ranked best-of-3, and the rest).
2. Approve the Competitive rules in section 3B, or tell me what to change.
3. Decide on the operator identity question for the stores.
4. Approve the roadmap order. On approval I start Phase 0 on the preview and show you before anything is published.

## 7. What was not verified

- Signed-in screens and real two-account rated matches (sign-in is disabled on the preview).
- Real devices, real sunlight, VoiceOver and TalkBack.
- Real population, queue times and rating spread; tier bands, wait estimates and the Cloudflare cost figures are starting values.
- The bot delay (read in code, not timed).

The seven specialist reports and the playtest screenshots were working files in the review session and are not stored in this repository. Rows 14–17 come from the playtest lead's final report, which arrived after the first version of this plan.

## 8. Growth and income (added 16 Nov 2026, approved by the owner)

Keep these in mind for every later phase. Figures are rules of thumb, to be rechecked before acting on them.

**Where we started.** On 16 Nov 2026 production had 5 accounts, 2 friendships, 4 finished online matches and no rated players. Players come before features, income and apps.

**Product priorities**
1. **A reason to return daily.** Phase 4 (one shared daily puzzle, a streak with a fair freeze, a spoiler-free share grid) comes next after Phase 3. The share grid is also the main marketing channel.
2. **Design for an empty room.** Every online feature must work with very few players: say honestly when queues are quiet, offer a bot or a friend link, and avoid gates that need other players (the 5-Normal-games unlock stays off until queues are busy). Add asynchronous friend games (take your turn when you can, with a notification) after the daily puzzle.
3. **The first minute.** First-time visitors go straight into an easy bot Duel with two or three tips. Fix the reload that loses a bot game.

**Income: a supporter pass, not ads or advantages.**
- The product promise is no ads and nothing that helps you win, so income comes from a supporter pass (about €2.99 a month or €19.99 a year): cosmetic tile themes and avatars, a supporter badge, fuller stats and the daily-puzzle archive. Never gameplay advantages, never loot boxes or energy timers.
- About €2 per subscriber per month reaches you after VAT and fees, so €200 a month needs about 100 supporters. At the usual 1–3% of players paying, that means roughly 3,500–10,000 monthly players.
- Running costs are about €5–15 a month (hosting and domain); five or six supporters cover them.
- First step costs nothing to build: a "Support Lexivanto" link (Ko-fi or similar) on the site and in the result screen footer. Build the in-game pass at around 2,000 monthly players.
- Ads would need roughly 70,000–100,000 sessions a month for €200 and break the promise; not planned.

**Emotes, shop and season rewards (added 16 Nov 2026)**
- Emotes are preset reactions during a match, with no free chat, so there is nothing to moderate. Ship a free set of about six first, as a social feature, alongside the daily puzzle phase; then earnable ones; a shop only together with the supporter pass.
- Rules: own art only (the fox, robot and Milo characters; never another game's emotes), a mute button, shown beside the avatar and never over the board or keyboard, announced to screen readers, still under reduced motion, rate-limited. No random packs or loot boxes.
- What sells is what the opponent sees: emotes, badges, avatar frames. Keyboard and tile styles are seen only by their owner, so they are a supporter-pass perk, and every style must keep the clue shapes and the contrast rules.
- Season rewards go by tier, not by top 10: everyone who reaches Gold gets that season's emote, Master gets a badge. A top-10 badge waits until a few hundred people play ranked, because with few players it means little and it concentrates the incentive to cheat.

**Cheating (added 16 Nov 2026)**
- A solver in another tab cannot be fully prevented in any browser word game. The approach is to make cheating pay little and to detect it, not to promise prevention.
- Duel already blunts solvers: both guesses are revealed to both players, so good guesses help the opponent equally, and ties go to the earlier lock. Keep ranked on the shared-board Duel.
- Cheap protections, in order: keep ranked rewards cosmetic; shorten the Competitive clock in later rounds; add review flags for consistently fast, near-perfect play and for tab switching; match flagged accounts against each other; no automatic bans.
- Only if the data shows cheating: prototype "probe or call" (each round a player either probes for information or calls the answer, and a wrong call loses the word). It adds a bluffing skill that off-the-shelf solvers do not cover. Do not build a new game for this.

**Order of work**
1. Publish the Google pages, then the owner sets up Search Console, the www redirect and listings (itch.io, CrazyGames, Reddit word-game communities).
2. Phase 3 (Competitive), with the unlock gate off.
3. Phase 4: daily puzzle, streak, share grid, plus the free emote set and tier-based season rewards.
4. Support link.
5. Android listing (installable web app on Google Play; about €25 once; 12 testers for 14 days for new personal accounts).
6. Supporter pass and the emote shop at about 2,000 monthly players.
7. iPhone app last, at about 1,000 weekly players or once income covers Apple's €99 a year.

**App Store approval checklist (iPhone)**
- More than a wrapped website: push notifications, haptics, an offline screen (guideline 4.2).
- Sign in with Apple next to Google (4.8).
- Supporter pass sold through Apple in-app purchase (15% commission in the Small Business Program).
- In-app account deletion, reporting and blocking (already built).
- Never use "Wordle" or "Cowordle" in the name, keywords, screenshots or description; Apple removed lookalikes in 2022 and the New York Times enforces the name. Lexivanto's own name, clue shapes and two-player modes are the difference to stress.
- EU trader status: selling through either store publishes the operator's name, address and phone number. Confirm with an accountant how income is received and taxed before charging anything.
