# Lexivanto visual system (2027 redesign)

Source of truth for the look: the Figma file "Lexivanto — Redesign 2027", https://www.figma.com/design/KeY08mZ8AcKEfxFJAHAido (Foundations, Components and screen pages). Implementation: `public/lexi.css` (single stylesheet for the game and guide pages) and `public/fonts.css` (self-hosted Inter 400/700 and Lexend 600/800, SIL OFL). `public/style.css` remains only for the two licence pages. The September 2026 look (style/arena/premium/avatars CSS) was retired in Phase 2; its history is in git.

Mode: Operate. A competitive word game used on a phone, often outdoors and in short sessions. Precision and restraint; the board and keyboard are the hero.

## Tokens
Defined as CSS custom properties on `:root` (light) and `:root[data-theme=dark]`; new players default to dark.

| Role | Dark | Light |
|---|---|---|
| Background / surface / raised / sunken | #07101f / #0f1e36 / #172b4a / #050b16 | #eef3f9 / #fff / #fff / #e1e9f3 |
| Text primary / secondary / tertiary | #f4f8ff / #c2d3ea / #93aacb | #0a1830 / #35486a / #52678a |
| Border subtle / strong, focus | #2b4668 / #6485b0, #51d4ff | #c3d0e2 / #5e7391, #075a75 |
| Primary action (neutral, never a tile colour) | #f4f8ff on #07101f | #0a1830 on #fff |
| Exact tile | #3ccbfa, letter #021019 | #075a75, letter #fff |
| Present tile | #f7b84a disc, letter #1a1000 | #f2ae30 disc, letter #1a1000 |
| Absent tile | #0f1e36, letter #93aacb | #e1e9f3, letter #35486a |
| Competitive / Normal / Friend / Bot | #b9a0ff / #51d4ff / #5fe3b3 / #9db8dd | #5b36c9 / #075a75 / #0b6b4b / #44546e |
| Danger / success / warning | #ff8a80 / #5fe3b3 / #f7b84a | #b3261e / #0b6b4b / #8a5a00 |

All tile and key letters are at least 7:1 against their fill in both themes; body text at least 4.5:1; control borders at least 3:1.

## Tile language
Shape first, colour second, so clues survive colour blindness, greyscale and glare:
- **Exact:** solid square with a tick in the corner.
- **Present:** a disc inside a dark slot.
- **Absent:** flat and dim.
- **Locked (Duel):** the opponent's hidden guess shows as dashed tiles with a dot.
The same shapes appear on keyboard keys. No Unicode glyphs; icons are drawn SVG (24 px, 2 px stroke, round caps).

## Type
Lexend (600/800) for headings, tiles, numbers and keys; Inter (400/700) for all UI text. Base size follows the reader's text-size setting (`1rem`). Smallest text 12 px, used only for short labels.

## Layout and navigation
- Phone: compact top bar (logo, Back, in-match exit) and a bottom tab bar: Play, Friends, Inbox, Ranks, Me (64 px + safe area). From 768 px the tab bar becomes a left rail. The tab bar is hidden during a match.
- Friends, Inbox, Ranks and Me are screens beside the tab bar (non-modal dialogs managed by `public/nav.js`); confirmations and results stay modal, as bottom sheets on phones.
- Play home: four ways to play in two groups (Online: Competitive, Normal; Private: Play a friend, Practise vs bot). Each card names whether it is rated.
- Match: label chip (COMPETITIVE · RATED, NORMAL · NOT RATED, FRIEND GAME · NOT RATED, PRACTICE · NOT RATED), players, timer, scrolling history, draft row and keyboard. The keyboard stays fully on screen down to 320×568 and 683×384 (200% desktop zoom).
- Tap targets: 48 px for new controls; keyboard keys at least 44 px tall.

## Motion
Short and stateful (150–420 ms, exponential ease-out): tile flip on reveal (90 ms stagger), invalid-word shake, invitation banner slide, result medal spring on a win, urgent-timer pulse, search radar. `prefers-reduced-motion` removes all of it.

## Validation (Phase 2)
119 automated tests. Browser evidence at 320, 390, 768, 1366 and 683×384, both themes, guest and mocked signed-in, plus 200% text: no horizontal overflow, no overlapping controls, no clipped titles or badges, keyboard on screen. Physical iOS/Android devices and real signed-in accounts were not available in the review session.
