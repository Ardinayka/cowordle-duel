---
name: Lexivanto
description: A live, fair two-player word game for the phone (2027 redesign).
colors:
  night-bg: "#07101f"
  night-surface: "#0f1e36"
  night-raised: "#172b4a"
  night-sunken: "#050b16"
  night-ink: "#f4f8ff"
  night-muted: "#c2d3ea"
  night-faint: "#93aacb"
  night-line: "#2b4668"
  night-line-strong: "#6485b0"
  night-focus: "#51d4ff"
  night-key: "#22395c"
  day-bg: "#eef3f9"
  day-surface: "#ffffff"
  day-sunken: "#e1e9f3"
  day-ink: "#0a1830"
  day-muted: "#35486a"
  day-faint: "#52678a"
  day-line: "#c3d0e2"
  day-line-strong: "#5e7391"
  day-focus: "#075a75"
  day-key: "#d5dfec"
  exact-night: "#3ccbfa"
  on-exact-night: "#021019"
  exact-day: "#075a75"
  on-exact-day: "#ffffff"
  present-night: "#f7b84a"
  present-day: "#f2ae30"
  on-present: "#1a1000"
  competitive-night: "#b9a0ff"
  competitive-day: "#5b36c9"
  normal-night: "#51d4ff"
  normal-day: "#075a75"
  friend-night: "#5fe3b3"
  friend-day: "#0b6b4b"
  bot-night: "#9db8dd"
  bot-day: "#44546e"
  danger-night: "#ff8a80"
  danger-day: "#b3261e"
  warning-night: "#f7b84a"
  warning-day: "#8a5a00"
typography:
  display:
    fontFamily: "Lexend, Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Lexend, Inter, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: "Lexend, Inter, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
  tile:
    fontFamily: "Lexend, Inter, system-ui, sans-serif"
    fontWeight: 800
    lineHeight: 1
rounded:
  tile: "8px"
  control: "12px"
  panel: "16px"
  sheet: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.night-ink}"
    textColor: "{colors.night-bg}"
    rounded: "{rounded.control}"
    height: "52px"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "{colors.night-key}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "10px 18px"
  tile-exact:
    backgroundColor: "{colors.exact-night}"
    textColor: "{colors.on-exact-night}"
    rounded: "{rounded.tile}"
  tile-present:
    backgroundColor: "{colors.night-sunken}"
    textColor: "{colors.on-present}"
    rounded: "{rounded.tile}"
  tile-absent:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-faint}"
    rounded: "{rounded.tile}"
  key:
    backgroundColor: "{colors.night-key}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.tile}"
    height: "54px"
  way-card:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
  match-chip:
    textColor: "{colors.night-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: Lexivanto

Source of truth for the look: the Figma file "Lexivanto — Redesign 2027", https://www.figma.com/design/KeY08mZ8AcKEfxFJAHAido (Foundations, Components and screen pages; page 08 holds the launch animation, Your games, daily word, turn-based games, reactions and App & notifications as shipped in November 2026, with the GameRow, Reaction and DistRow components). Implementation: `public/lexi.css` (single stylesheet for the game and guide pages) and `public/fonts.css` (self-hosted Inter 400/700 and Lexend 600/800, SIL OFL). `public/style.css` remains only for the two licence pages. The September 2026 look (style/arena/premium/avatars CSS) was retired in Phase 2; its history is in git.

The frontmatter lists the dark ("night") and light ("day") values; component tokens show the dark theme, which new players get by default. In CSS each role is one custom property on `:root` (light) and `:root[data-theme=dark]` (dark), for example `--exact`, `--on-exact`, `--present`, `--ink`.

## Overview

**Creative North Star: "The Night Scoreboard"**

Dark, calm surfaces with the clues lit up like a scoreboard. The board and keyboard are the stars; everything else steps back. This is Operate mode: a competitive word game used on a phone, often outdoors and in short, interrupted sessions, so precision and restraint matter more than decoration.

Clues are read by shape first and colour second, so they survive colour blindness, greyscale and glare. The primary action is neutral (the ink colour), never a tile colour, so a button can never be mistaken for a clue. Each way to play has its own accent (Competitive violet, Normal cyan, Friend green, Bot slate), used for edges and labels, not for fills behind text.

**Key Characteristics:**
- Board and keyboard first; the keyboard stays fully on screen down to 320×568 and 683×384.
- Shape-coded clues on tiles and keys.
- Neutral primary action; accents name the way to play.
- Every match shows a label chip saying whether it is rated.
- Short, stateful motion that reduced-motion removes entirely.

## Colors

A deep navy night with one cyan, one amber and four quiet way-to-play accents; the light theme mirrors it with darker, AAA-safe tones.

### Primary
- **Scoreboard Cyan** (exact-night / exact-day): the exact-letter tile and key, links and the dark-theme focus ring. Its letter colour (on-exact) is at least 7:1.
- **Lamp Amber** (present-night / present-day): the disc inside a present-letter slot, with on-present letters.

### Secondary
- **Way accents** (competitive, normal, friend, bot in both themes): card edges, match label chips and the Ranks screen. Never a large fill behind body text.

### Neutral
- **Night Navy** (night-bg, night-surface, night-raised, night-sunken): background, cards, sheets, and input or slot wells.
- **Starlight Ink** (night-ink, night-muted, night-faint): primary, secondary and tertiary text. Night-ink is also the primary button fill.
- **Night Lines** (night-line, night-line-strong): subtle and strong borders; control borders are at least 3:1.
- **Day equivalents** (day-*): the same roles in the light theme.
- **Status** (danger, warning; success shares the friend green): errors, timers and confirmations.

### Named Rules
**The Neutral Action Rule.** The primary button uses the ink colour, never a tile or accent colour.

**The Seven-to-One Rule.** Every tile and key letter is at least 7:1 against its fill in both themes; body text at least 4.5:1; control borders at least 3:1.

## Typography

**Display Font:** Lexend 600/800 (fallback Inter, system-ui)
**Body Font:** Inter 400/700 (fallback system-ui, -apple-system, Segoe UI, Roboto)

**Character:** Lexend's open, even letterforms make tiles, keys and numbers easy to read at a glance; Inter keeps the interface text quiet.

### Hierarchy
- **Display** (Lexend 800, 1.75rem, 1.2): screen titles.
- **Headline** (Lexend 800, 1.375rem, 1.2): dialog and section titles.
- **Title** (Lexend 600, 1.0625rem, 1.2): card titles and sub-sections.
- **Body** (Inter 400, 1rem, 1.5): all UI text. Sizes are in rem, so they follow the reader's text-size setting.
- **Label** (Inter 700, 0.75rem, 0.04em, uppercase): match label chips and badges only. 12 px is the smallest text, used only for short labels; tab labels may shrink to 11 px on the narrowest phones.
- **Tile** (Lexend 800, 46% of the tile size): letters on tiles; keys use Lexend 600.

### Named Rules
**The No-Glyph Rule.** No Unicode glyphs for icons or clues. Icons are drawn SVG (24 px, 2 px stroke, round caps).

## Layout

- Phone: compact top bar (logo, Back, in-match exit, 56 px) and a bottom tab bar: Play, Friends, Inbox, Ranks, Me (64 px plus the safe area). From 768 px the tab bar becomes a left rail. The tab bar is hidden during a match.
- Friends, Inbox, Ranks and Me are screens beside the tab bar (non-modal dialogs managed by `public/nav.js`); confirmations and results stay modal, as bottom sheets on phones.
- Play home: the Daily word card (group Today, amber accent) above four ways to play in two groups (Online: Competitive, Normal; Private: Play a friend, Practise vs bot). Each card names whether it is rated.
- Daily word uses the match layout without an opponent: chip DAILY WORD #N, GUESS N OF 6, and a result sheet with the spread of results and a Share result button.
- First-visit welcome note on Play and tips in the first game sit in the flow (never over the board) with a Got it button. Guests see Create invitation link first on Play a friend; sign-in features stay out of their way. Reactions replace the sender's status line for a few seconds; the reaction button takes the place of "vs" and opens a row of chips that pushes the board down while open.
- Match: label chip, players, timer, scrolling history, draft row and keyboard. Competitive shows "WORD 2 OF 3 · 1–0" where other games show the round, and the status line gives the stakes ("Win +14 · Lose −18") before word 1 and the previous word's answer between words. The board grows into the free space (tile size 30–56 px, set from the container) and the keyboard stays fully on screen. Height breakpoints at 700, 600 and 450 px tighten the match screen.
- Width breakpoints: 360 and 599 px (compact phone), 768 px (left rail), 1100 px (wide desktop).
- Spacing steps of 8, 12, 16, 20 and 24 px.
- Tap targets: 48 px for new controls; keyboard keys at least 44 px tall.
- Launch animation, like the start of a game: on opening the app, the middle of five empty tiles flips through 3, 2, 1 (220 ms each, on the amber present disc), then the five tiles flip one after another (60 ms apart, 360 ms) into a solved word with exact ticks and the layer fades into Play (240 ms). The word changes each launch from a friendly list (HELLO, CHARM, MERRY, …); TODAY when a daily streak is waiting. About 1.3 s, never more than 2.5 s; links from notifications skip it; reduced motion shows the final word, still. App opening only, not at the start of each game.
- Turn-based games: a Your games list at the top of Play (rows: vs name, game type, a state chip; Your turn chips in the friend green), and an Or take turns section under Create invitation link for signed-in players. The game screen shows FRIEND GAME · TAKE TURNS and the move time left instead of a clock.
- Me has an App & notifications panel (install, two notification switches, support link when set). The app icon is the LEX tile logo on Night Navy (#07101f), with a maskable version for Android. The offline page is self-contained and follows the system theme.

## Elevation & Depth

Mostly flat, with tonal layering (sunken, surface, raised) doing most of the work. Three soft shadows add depth only to things that float.

### Shadow Vocabulary
- **Rest** (`--shadow-1`, 0 2px 6px): way cards and other resting cards.
- **Float** (`--shadow-2`, 0 8px 24px): defined for floating menus; not yet used.
- **Sheet** (`--shadow-3`, 0 16px 40px): dialogs, bottom sheets and the invitation banner.

Dark-theme shadows are stronger (25–50% black) than light (8–20% navy) so they still read on navy.

## Shapes

Gently rounded rectangles: tiles and keys 8 px, controls 12 px, cards and panels 16 px, sheets 24 px. Chips, switches and avatars are full pills or circles. Borders are 1.5 px on controls and cards, 2 px on tiles.

### Tile language
- **Exact:** solid square with a tick in the corner.
- **Present:** a disc inside a dark slot.
- **Absent:** flat and dim.
- **Locked (Duel):** the opponent's hidden guess shows as dashed tiles with a dot.

The same shapes appear on keyboard keys.

## Components

### Buttons
- **Shape:** rounded (12 px).
- **Primary:** ink fill with background-coloured text, 52 px tall, bold.
- **Secondary:** quiet key-coloured fill with a strong border, 48 px tall.
- **Hover / Focus / Active:** a slightly darker fill on hover; a 3 px focus ring (cyan in dark, teal in light) with a 2 px offset; a 97% scale press.
- **Icon buttons:** 48×48 with a drawn SVG mask.

### Way cards
Full-width stacked cards on Play: a 52 px icon, title and meta line, and a chevron. Each card's border uses its way-to-play accent. Badge and title sit in separate grid areas; titles never break mid-word.

### Match label chip
A pill with a 1 px current-colour border and an uppercase label (COMPETITIVE · RATED, NORMAL · NOT RATED, FRIEND GAME · NOT RATED, PRACTICE · NOT RATED).

### Tiles and keyboard
Tiles follow the tile language above. Keys are 54 px tall (46 px on short screens, never under 44 px), with the same clue shapes. Key labels are capped at 24 px (Enter at 13 px) so they never overflow at large text sizes. Enter shows a ready state when the draft is complete.

### Navigation
Bottom tab bar with icon and label; the current tab gets a pill behind its icon and `aria-current`. Labels shrink with the screen width (11–12 px) and keep accessible names. Inbox shows a count badge.

### Invitation banner
Slides in below the top bar (or at the bottom inside a dialog) with a countdown track, Accept, Decline and Later. In a match it shrinks to a strip above the current word.

### Inputs
Sunken fill, 1.5 px strong border, 12 px radius, 52 px tall; focus is a 3 px ring with no offset.

## Do's and Don'ts

### Do:
- **Do** keep motion short and stateful (150–420 ms, exponential ease-out): tile flip on reveal (90 ms stagger), invalid-word shake, invitation banner slide, result medal spring on a win, urgent-timer pulse, search radar.
- **Do** remove all of that motion under `prefers-reduced-motion`.
- **Do** check every visual change at 320, 390, 768 and 1366 px, at 683×384 (200% desktop zoom) and at 200% text, in both themes (see AGENTS.md).

### Don't:
- **Don't** use a tile colour or accent as the primary button fill.
- **Don't** convey a clue by colour alone.
- **Don't** put anything over the board or keyboard during play.
- **Don't** use Unicode glyphs as icons.

## Validation (Phase 2)

119 automated tests. Browser evidence at 320, 390, 768, 1366 and 683×384, both themes, guest and mocked signed-in, plus 200% text: no horizontal overflow, no overlapping controls, no clipped titles or badges, keyboard on screen. Physical iOS/Android devices and real signed-in accounts were not available in the review session.
