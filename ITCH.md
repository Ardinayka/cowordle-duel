# Lexivanto on itch.io

Page: https://ardinayka.itch.io/lexivanto (owner's account). The itch page runs the live game from lexivanto.com
inside a small launcher (`itch/index.html`), so it never needs a new upload after a website update.

## How it works

- `itch/index.html` is the only file uploaded to itch.io (as `lexivanto-itch.zip`). It fills itch's game frame with
  `https://lexivanto.com/?from=itch`.
- The server allows framing only by lexivanto.com itself, ChatGPT and itch.io (`frame-ancestors` in `server/worker.js`).
- Inside another site the game runs in **embedded mode** (`public/app.js`): guest play only, because browsers do not
  send the sign-in cookie to a site shown inside another site. Me shows "Open lexivanto.com to sign in" (new tab);
  install and notifications are hidden; the service worker is not registered. Invitation links still point to
  lexivanto.com, so a friend opens them normally.
- Visits from itch are counted once a day per device as the `visit_itch` metric in `daily_stats`.

## Upload steps (owner)

1. Publish the website change first (the frame permission must be live on lexivanto.com before the upload works).
2. Create the project: Kind of project **HTML**, upload `lexivanto-itch.zip`, tick **This file will be played in the browser**.
3. Embed options: **Embed in page**, viewport **960 × 720**, **Mobile friendly** on (orientation **Portrait**),
   **Fullscreen button** on, Automatically start off, Scrollbars off.
4. Cover: `itch/cover-630x500.png` (1260 × 1000, same shape as 630 × 500). Screenshots: `itch/screenshot-1…5.png`.
5. Save as **Draft**, open the page, play a bot game and the daily word, check Me, then set Visibility to **Public**.
   itch.io lists a page in New releases only once, so publish when it is ready.

## Page texts

**Title:** Lexivanto

**Short description:** Word games for two: duel a friend, race to solve, team up, or play the daily word.

**Description:**

> **Lexivanto turns the five-letter word puzzle into a game for two.**
>
> Guess the hidden five-letter word. After each guess, every letter shows a clue: a tick for the right place, a circle
> for a letter that is in the word somewhere else, and a dark tile for a letter that is not in it. The clues use shapes
> as well as colors, so they work for color-blind players.
>
> **Ways to play**
> - **Duel:** you and your opponent each lock a guess, then both are revealed on one shared board. Use each other's clues and solve it first.
> - **Race:** same word, separate boards. First to solve wins.
> - **Co-op:** take turns on one board and solve it together.
> - **Word Swap:** choose the word your friend has to find.
> - **Daily word:** one word a day for everyone, six guesses, a streak and a spoiler-free result to share.
> - **Practice vs bot:** Easy, Medium or Hard, with no clock.
>
> **Play with a friend:** choose Play a friend, create an invitation link and send it. No account needed.
>
> **Online:** Normal finds a real opponent with nothing at risk. Competitive (best of three words, tiers and seasons)
> needs a free account on lexivanto.com.
>
> **About this page:** the game runs on lexivanto.com and this page shows the live version, so it is always up to date.
> Here you play as a guest. To keep your friends, rating and streak across devices, sign in on lexivanto.com.
>
> No ads, and nothing to buy that helps you win. If you enjoy it, you can support it on Ko-fi: https://ko-fi.com/elbully
>
> Feedback and word suggestions are welcome in the comments.

## Metadata

- Classification: Games. Release status: In development (the site is labelled Beta). Pricing: No payments.
- Genre: Puzzle. Tags (pick from itch's suggestions as you type): Word Game, PvP, Co-op, Turn-based, Casual, Minimalist.
  Do not add Multiplayer or the game's name as tags (itch's guidelines; multiplayer is set below).
- Multiplayer: Server-based networked multiplayer. Player count: 1–2.
- Inputs: Keyboard, Mouse, Touchscreen. Accessibility: Color-blind friendly. Languages: English. Average session: A few minutes.
- Links: https://lexivanto.com
- Community: Comments on.
- AI disclosure: answer honestly. The code was written with AI assistance; mark images, sound or text only if you know they were AI-generated.

## Not verified

- The real itch.io page (needs the owner's account). The launcher was tested in a simulated itch page
  (itch page → itch's game frame → launcher → game) at 960 × 720 and on 390 and 320 px phones, with the real
  frame permission checked against the preview.
- Clipboard and share inside itch's frame depend on what itch's frame allows; the game falls back to showing the
  link or result text to copy by hand.
