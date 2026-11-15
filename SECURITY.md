# Security maintenance

Project owner alias: bully.

## Implemented controls

- Server-verified Google ID tokens, one-use challenges, Secure HttpOnly account cookies and CSRF validation.
- Multiplayer actions checked against server-owned state, the participant token, room revision and match generation. Unrevealed words and credentials are excluded from opponent views.
- Byte limits before database work: 2 KiB game/friend requests, 8 KiB contact requests, 14,000 bytes authentication. Contact text is separately capped at 800 characters.
- D1 atomic rate counters. Read requests reserve small batches of credits to reduce write overhead while retaining global caps. Unused credits in cold isolates are not shared or refunded.
- Room/activity reads: 240 per seat/minute and 12,000 per network/minute. Mutations retain separate, lower budgets; leaving and cancellation use their own budget. The client honours retry delays without discarding a word.
- Friend requests: five per sender/recipient per minute, one new request per pair per ten elapsed minutes, ten outgoing and twenty incoming pending requests. Up to 100 accepted friends, enforced during acceptance. Pending requests expire after seven days.
- Challenges: five per sender/minute and one per pair/minute. Persistent account blocks are checked again during friend insertion, acceptance, challenges, private join commits and online pairing.
- Reports: same-origin JSON, validated category/text/references, optional validated email, honeypot, three per session/account per hour and ten per hashed network address per hour, plus per-minute caps. No public report retrieval route. Rotating network addresses/accounts can still evade application-level quotas.
- Bounded cleanup is claimed once per minute across Workers. Room heartbeat writes are spaced by 15 seconds. Avatar IDs and colours are allowlisted.
- Static response CSP, MIME checking, referrer policy, conditional ETags and version-specific immutable caching.

## Dependencies

Vite and esbuild are pinned. The esbuild override updates the legacy transitive build-tool copy. Validate the build, tests, preview and migration generator when changing this override. Do not use a forced audit fix that downgrades the migration tool. A clean package audit is not proof of application or infrastructure security.

## Operations

See OPERATIONS.md for manual report review and outstanding provider checks. Account-level blocking is not device-wide banning. Guest tokens do not verify a human identity. Fixed-window quotas are not a substitute for edge protection against distributed attacks. No new public administration or database browsing endpoint is introduced.

Current source uses the owner alias. Historical commits and previously distributed copies are not rewritten by a normal source update.
