# Lexivanto

Modes: locked-round Duel, Race, and alternating Co-op. Each supports a bot or a two-player friend room, configurable clocks, EN/PT-PT, keyboard/touch input, and rematches. A 12-character room code or invitation link joins a friend room; site access is a separate prerequisite.

## Implementation

Client source is in `public/`. `server/worker.js` serves embedded assets and room APIs. D1 keeps room state with revision-checked updates; selected words and opponent pending guesses are excluded from player views. Race boards stay private until finish. Server time controls deadlines. Room credentials are random 256-bit bearer tokens held in sessionStorage and hashed before storage. Rooms expire after 24 hours, and bounded expired-room cleanup runs at room creation.

Drizzle owns schema migrations under `drizzle/`. `.openai/hosting.json` declares `DB`. `node scripts/build.mjs` bundles the Cloudflare Worker into `dist/server/index.js`. Build output is ignored. `node --test tests/*.test.js` requires a build first and Node with node:sqlite support.

## Validation and limitations

41 automated tests cover scoring and mode transitions, sudden death, invalid guesses, hidden state, two concurrent player submissions, competing joins, restoration, expiry, touch-control startup, stable keyboard nodes, saved settings, bot deduction levels, signed Google-token verification, CSRF, challenge replay, session revocation, and account deletion. Independent source reviews checked server concurrency and client lifecycle. Tests use the compiled Worker with a SQLite-backed D1 adapter and a simulated DOM; they do not establish live two-device or browser compatibility. No browser/device QA has been performed.

Dictionaries remain preview-sized. No ranked matchmaking, payments, native app package, or account match-history sync. The Site is public; random online matchmaking is unrated.

D1 optimistic writes use `D1Result.meta.changes`, verified against the [Cloudflare return-object reference](https://developers.cloudflare.com/d1/worker-api/return-object/).


## Google setup (owner action)

1. Create a Google OAuth **Web application** client in Google Cloud. Configure its branding, support contact, homepage and privacy information. Use the exact final HTTPS origin as an Authorized JavaScript Origin: `https://lexivanto-beta.garrettardi.chatgpt.site`. This callback-based GIS flow does not use a redirect URI.
2. Set the public client ID as the Site runtime variable `GOOGLE_CLIENT_ID` and redeploy. No client secret is used by this ID-token flow. Never put a client secret into public assets.
3. Test the Google-rendered button on the standalone deployed URL. Confirm sign-in, reload, logout, wrong-account switching and account deletion. This has not been tested with a real Google client yet.

The Worker verifies Google's fixed JWKS endpoint, RS256 signatures, issuer, audience, expiry, issued-at, subject and nonce. A browser-bound challenge and CSRF value are consumed once. Session identifiers are random and hashed in D1, with Secure/HttpOnly/SameSite cookies. Profile identity uses Google `sub`, not email. The Google script loads only on an explicit sign-in click. In-app privacy notes explain retained data and the limitations of guest-room persistence.

Official references: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid and https://developers.google.com/identity/gsi/web/guides/verify-google-id-token .

## Friend beta access and release limits

The site is public with owner authorization. Guests can access the game without ChatGPT sign-in. No invitations have been sent automatically.

Suggested first cohort: 5–10 friends, test Easy practice first, then paired Duel/Race/Co-op with one phone and one desktop. Check time limits, refresh/rejoin, expired rooms and rematches. Collect missing dictionary words and difficulty feedback before a wider release. No public ranking or acquisition campaign is included.

Lexivanto is a provisional independent name. An initial exact-name web search returned no results; this is not trademark, domain, linguistic, asset, or legal clearance. No risk-free launch or affiliation with established word-game brands is claimed. Public release still needs brand clearance and owner-specific legal/privacy details.


## Menu and matchmaking

New public flow is Mode → Opponent → game. Online invokes `/api/matchmaking/search` immediately, with a tab-local random search ID; `/cancel` retires that ID. D1 `batch()` guards room insertion and both queue assignments in one transaction. A cancelled search has a separate retirement record so another search cannot overwrite its cancellation. Queue leases are 20 seconds, unacknowledged lobbies 45 seconds, rooms up to 24 hours. All match projections hide credentials and hidden words. Bots never fill the online queue.

Tests additionally cover three-way pairing, duplicate self-search, mode/language isolation, lease expiry, cancelled-search replays, completed-search replays, transaction rollback, saved nickname/setup, untimed bots, and late network replies after Back. Tests use simulated DOM and SQLite, not real browser or live multi-device QA. UX Pilot's flow preview failed; a manual flow review was used. Optional FigJam flow creation awaits a team selection in its widget.


## Latest gameplay update

Duel supports explicit clockMode response alongside legacy round timing. New UI rooms and online queues use response timing, while saved rooms without the flag remain unchanged. Online accepts whitelisted timing values and separates queues by clockMode + seconds in rules version2. Bots force seconds0. Engine and Worker checks cover hidden first lock, first-lock-only deadline, invalid/repeated attempts, exact-boundary timeout, refresh and next-round reset.

English dictionary source/selection hashes: data/english-wordlist-provenance.md and data/english-wordlist-checksums.json. The user-facing licence includes the complete upstream notices. Accepted words are broader than secret answers and bot vocabulary. No browser or physical-device visual QA was performed; CSS viewport behaviour needs a real phone check, especially unusual zoom, browser chrome and landscape.
