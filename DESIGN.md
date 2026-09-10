# Duel playing surface
Mode: Operate. Quiet competitive wordplay with an indigo focal board, editorial serif side introduction and legible sans-serif controls. Desktop has rules/board/clue columns; phones retain a compact rules summary above the board and clue guidance below it. No raster imagery needed.
Tokens: background #f4f5f8; surface #ffffff; text #172036; secondary #626c80; line #dfe3eb; primary #3358cf; exact #126a73; present #765194; absent #586477. Tile feedback includes distinct symbols and spoken descriptions. Radius 6px tiles, 8px controls, 16px arena. Motion: subtle timer transitions, disabled under reduced motion. Mobile keyboard is in normal flow, never over the six guess rows.

## Mode menu extension

Retains the indigo interaction colour, serif headings, and keyboard geometry. Desktop menu pairs three selectable mode rows with persistent match controls; mobile uses a compact three-mode radio selector above the same settings. Friend lobby shows frozen rules, seats, readiness and code. Race hides opponent clues; Duel distinguishes locked guesses and revealed rows. Long boards scroll within the arena so the keyboard stays accessible. Round/turn/match clock labels follow the selected mode. English and PT-PT cover the complete flow. Keyboard DOM is retained on unchanged room polls.


## Shared UX practices

Guest start is the primary action. Google is optional and does not block gameplay if it fails. Inputs have persistent labels. Main text uses 16px; frequent labels and status use at least 14px, with 12px reserved for secondary markers. Controls are at least 44px tall. Feedback uses words, symbols, and colour; focus indicators and reduced motion are supported. Preserve settings on mode switches and reload, preserve the keyboard on unchanged polling, keep mobile feature parity, and use actionable recovery copy. Automated DOM checks are not equivalent to browser/zoom/device validation.


## Menu redesign

The mode list is the primary opening surface: editorial-scale labels with a short rule cue, no side-by-side settings panel. Subsequent steps reuse a narrow readable column. Opponent labels name what happens next. A bot-level click starts play; friend options use pressed-state chip buttons in an optional details section. Online searching has an indeterminate line and truthful wait copy, with a visible cancel action. Shared navigation contains Back, Menu, language buttons, Profile and Help. Account actions move into Profile to keep sign-in secondary. Focus follows step headings, dropdowns are removed, and reduced motion disables the search animation.


## Phone play and light/dark contrast

Current input is a separate pinned row above the keyboard; revealed history scrolls within the remaining viewport. During active play, phone header keeps Back, Theme, Profile and Help, removing the redundant Menu and disabled language controls. Rules and clue legend remain reachable through Help. Status uses actual pending flags for both players, with urgent text when the opponent has locked. Timer is large only while counting, and no-clock text explains when the clock begins. Colour state includes text/symbols and never relies on colour alone.

Light exact #007f73 / white (4.90:1); present #ffcc3d / #211900 (11.59:1); absent #40516c / white (8.04:1). Dark exact #30e6c1 / #06251f (10.23:1); present #ffd447 / #251b00 (11.95:1); absent #405675 / white (7.48:1). These are calculated text-contrast ratios, not a claim of outdoor hardware testing.
