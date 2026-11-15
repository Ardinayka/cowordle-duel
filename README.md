# Lexivanto

Public, English-only browser word game: Duel, Race and Co-op. Guest play, Google sign-in, untimed practice bots, random online opponents, private rooms and consent-based friends. Maintained by bully.

See PRODUCT.md for current gameplay and interface behaviour, SECURITY.md for controls, and OPERATIONS.md for release evidence and follow-up work.

## Development

Client source is in public/. server/worker.js serves embedded public assets and APIs. D1 stores rooms, accounts, friendships, blocks, reports and rate counters. Schema and append-only migrations are under db/ and drizzle/. Build output is ignored.

```sh
npm ci
npm run build
npm test
npm run dev
```

Use Node 24.22.1. Tests run against the compiled Worker, a SQLite D1 adapter and
simulated client DOM. Preview data is separate from production. Generate new
migrations with `npm run db:generate` and review the SQL before publishing.

## Authentication and storage

The public runtime variable GOOGLE_CLIENT_ID selects the Google OAuth Web application. Authorize the exact final HTTPS JavaScript origin in Google Cloud. The callback-based ID-token flow does not require a client secret or redirect URI. Test actual Google sign-in on the standalone published domain; the local preview does not contain production secrets.

Google signatures, issuer, audience, subject, expiry, issued-at and nonce are verified on the server. One-use challenges and CSRF checks protect authentication actions. Session cookies are Secure, HttpOnly and SameSite; only their hashes are stored. Google sub identifies the account, not an email address.

Room credentials are random 256-bit tab-local bearer tokens, hashed in storage. Player views omit credentials, hidden answers and unrevealed opposing guesses. D1 revision checks and atomic matchmaking batches protect concurrent players. Rooms expire after 24 hours; clients never choose the hidden word in the published normal modes.

## Publishing

See [Deployment](DEPLOYMENT.md) to publish the preview or the live site directly
with Cloudflare. The public domain is https://lexivanto.com. The preview and
production Workers use separate D1 databases. Reverting Worker code does not
revert database migrations.

Current source uses the owner's alias. This does not remove information from historical commits, hosting account metadata or copies distributed previously. Third-party licences and their required attribution remain intact.
