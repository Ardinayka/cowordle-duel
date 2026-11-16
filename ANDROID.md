# Lexivanto on Google Play

Lexivanto goes on Google Play as a **Trusted Web Activity (TWA)**: a small Android app that opens lexivanto.com full screen, with no browser bar, using the installable web app built in Phase 5 (manifest, icons, service worker, notifications). There is no second codebase: every website update reaches the Android app at once.

This guide lists what the owner does (accounts, payments, testers) and what is already prepared in the repository.

## Already prepared in the repository

- `public/manifest.webmanifest`: name, icons (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`), colours, start URL and screenshots. Chrome reports no installability errors.
- `public/sw.js`: offline page and push notifications.
- `/.well-known/assetlinks.json`: the file that proves the app and the website belong together. The Worker serves it once two Cloudflare variables are set (step 5); until then it answers 404.
- Store listing draft (below), screenshots in `public/gameplay-*.webp`, feature graphic source `public/og-image.png`.

## Owner steps

1. **Google Play developer account.** Create one at play.google.com/console (one-time fee of about €25 / US$25). New personal accounts must verify identity; the developer name and, for paid apps or in-app sales, an address are shown publicly. Decide which name to publish under before you start.
2. **Choose the package name.** Suggested: `com.lexivanto.app`. It can never change once published.
3. **Build the Android package (about 30 minutes, on a computer with Node.js).**
   ```bash
   npx @bubblewrap/cli init --manifest https://lexivanto.com/manifest.webmanifest
   ```
   Answer the prompts: application ID `com.lexivanto.app`, launcher name `Lexivanto`, display mode `standalone`, status bar colour `#07101f`, enable notifications delegation (yes). Bubblewrap downloads the Android tools it needs and creates a signing key. **Keep the key file and its passwords safe;** losing them means you can never update the app.
   ```bash
   npx @bubblewrap/cli build
   ```
   This produces `app-release-bundle.aab`.
4. **Create the app in Play Console** and upload the `.aab` to a **closed testing** track. Turn on Play App Signing (the default).
5. **Link the app to the website.** In Play Console, open *Test and release → App integrity → App signing* and copy the **SHA-256 certificate fingerprint**. In `cloudflare.config.ts`, add to the production Worker's `env`:
   ```ts
   ANDROID_PACKAGE: bindings.text("com.lexivanto.app"),
   ANDROID_SHA256: bindings.text("AA:BB:...:FF"),
   ```
   (Several fingerprints can be listed, separated by commas, for example the upload key and the Play signing key.) Publish, then check `https://lexivanto.com/.well-known/assetlinks.json`. Without this, the app shows a browser bar.
6. **Closed test: 12 testers for 14 days.** Google requires this for new personal developer accounts before production access. Testers join with their Google account through the opt-in link. Friends and family who already play are ideal; they should open the app on several days.
7. **Store listing, content rating and data safety** (texts below), then apply for production access and publish.

## Store listing draft

- **App name:** Lexivanto: Word Duel & Co-op
- **Short description (80 characters max):** Word games for two: duel a friend, race to solve, team up, or play the daily word.
- **Full description:**

  Lexivanto turns the five-letter word puzzle into a game for two.

  • Duel: both players lock a guess, then both are revealed on one shared board. Use each other's clues and solve it first.
  • Race: same word, separate boards. First correct guess wins.
  • Co-op: take turns on one board and solve it together.
  • Word Swap: pick the word your friend must guess.
  • Daily word: one word a day for everyone, six guesses, with a streak and a spoiler-free result to share.

  Play a friend with a link (no account needed), find an online opponent in Normal, or climb the Competitive ladder: best of three words, placements, tiers and seasons. No opponent around? Practise against a bot on Easy, Medium or Hard.

  Clues use shapes as well as colours, so the game works for colour-blind players. Light and dark themes. No ads, nothing to buy that helps you win.

- **Category:** Games → Word. **Tags:** word, puzzle, multiplayer.
- **Contact:** use the contact form address published on the site; Play requires an email address for the listing.
- **Privacy policy URL:** https://lexivanto.com/privacy.html

## Content rating and data safety (answers to check before submitting)

- **Content rating questionnaire:** no violence, no sexual content, no gambling. Users can interact: yes (preset reactions only, no free chat; usernames are visible; blocking and reporting exist).
- **Data safety:** data collected = user IDs (Google account identifier and player tag, for signed-in players), app activity (game results, daily word results), app info (crash-free; no analytics SDK). Data is encrypted in transit; users can request deletion (Me → Delete account). No data is sold or shared for advertising. Check the privacy page for anything that changed since this draft.

## Not verified yet

- Building the package and the Play review, which need the owner's accounts.
- Notifications delivered through the Android app on a real phone.
- Whether Google accepts the closed test with these testers; follow Play Console's current requirements, which change often.
