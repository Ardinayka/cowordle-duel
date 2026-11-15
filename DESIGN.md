# Lexivanto competitive visual system

Approved reference: https://www.figma.com/design/ELQ2KEDLoXXbtwPNNwNUb1 . Mode: Operate, with a competitive game identity. Navy surfaces, cyan action highlights, amber clues and violet Co-op accent. User requested restrained glow and soft offset shadows, not elaborate lightning textures.

## Tokens
Dark: background #080e20, surface #111c32, arena #0d162a, text #f3f7ff, secondary #a8b8d0, border #29415d, primary/exact #51d4ff, present #f5b84c, absent #33445e. Exact and present use dark text; absent uses white. Light: background #eef3f9, surface #ffffff, text #111c32, secondary #475871, primary #086484, exact #08738e. Keep symbols and accessible descriptions for every clue.

Typography: self-hosted Inter 400/700, body16px, frequent labels14–16px, secondary markers12px. Main heading32–42px; mode labels26–28px. Tiles8px radius; controls10–12px; mode cards16px; arena18px. Dark depth: 0 14px 36px black28%; restrained cyan glow: 0 4px 22px cyan16%. Glows emphasize action and countdown, not every letter.

## Flow and responsive behavior
Three stacked mode cards remain the entry point. Guest name then Online/Friend/Bot. Online fixed30s, no selector. Friend settings retain optional chip controls, bot choices start untimed practice. Search shows true elapsed time and explicit cancellation/practice choices. Result includes Play again and Game modes, with Change settings as a quieter existing option.

Active play uses dynamic viewport height. Only revealed history scrolls; draft and keyboard remain in flow outside that region. Phone header keeps visible exit, theme, profile and help. In short/zoomed windows page scrolling is allowed to prevent clipping. Light preference persists; new users default dark. Reduced motion disables search animation and transitions.

## Validation for this release
46 existing tests pass. Browser preview was blocked by browser URL security policy, so current production rendering has not been visually verified in this session. Source review and contrast checks are scoped evidence, not physical-device certification. Figma uses editable concept layers and illustrative match values; production displays actual game state.

## Menu and profile update
English-only entry flow. Restore the original three large icon cards; no miniature letter headings or delayed selection. Header uses a 72px LEX logo without the wordmark, navigation in the middle and an avatar profile control at the right edge. Active play reduces the logo to 48px to protect board height. Theme and Help are inside Profile. Six high-contrast avatar colours persist on this device only; this is not shared account metadata.

Friends are accessed through Profile and private setup. Available friends appear inline after private rules, with direct Invite actions. No new permanent header item; a compact notification count uses the Profile control. Sign in remains visible for guests and the official Google button appears above personalisation controls.

## Private-room usability update
Use the events project's documented principles (Nielsen heuristics, WCAG/APG, GOV.UK research guidance): clear states, one action per button, essential rules visible, preserve work on failure, honest evidence. No external expert participation is implied. Private-room settings preserve participants; invitation banners avoid stealing focus; intermediate desktop widths use one centered arena. Profile character selection uses a six-cell generated illustration sheet. Close headers remain sticky in long dialogs.

## Approved visual concept implementation
The September premium study and user-approved LEX concept guide the current presentation. Gameplay code and rules are unchanged. Shared presentation is in public/premium.css, loaded after the legacy layout and avatar styles. Dark tokens: background #081426, surface #10223c, panel #0c1c32, text #f4f8ff, muted #b8cce6, border #2c4c70. Light theme retains its established tokens. Inter 400/700 is used throughout, including all dialog and result headings. Controls 12px, panels 16px, tiles 8px; press feedback is 100ms with reduced-motion support.

A generated 1254px transparent raster master is embedded in lexivanto-logo.svg (a delivery wrapper, not authored vector geometry). Header 72 CSS px; play 48px. The header Friends destination replaces the old large button above mode choices; narrow setup screens hide that shortcut when Back is visible, with Friends still in Profile and private setup. Three large mode cards stay primary. Profile opens with identity, retains account and tag controls, and groups character/colour choices inside Edit appearance. Close remains sticky. The game board retains its height-aware sizing with a 300px desktop / 280px phone cap. Results use the same type and controls as the other dialogs.

Validation: 73 automated tests passed. Browser inspected desktop and 390x700 menu, dark profile, light setup, phone active Race and centered result. Profile heading computed Inter and Close remained at y=33 with a 44px target after scrolling. Independent code review confirmed no removed/duplicate IDs and no gameplay JS changes. Header width and adaptive-board risks were corrected. Final browser populated-board confirmation was interrupted by transport loss; no physical-device certification is claimed.

### Stable word workspace follow-up
- Unified history and draft row widths with explicit five-column tracks; removed viewport-height-derived word sizing.
- Short histories sit beside the current draft; long histories remain scrollable while keyboard stays visible.
- Duel displays safe covered slots from submitted booleans, revealing only when existing engine state reveals both words. No gameplay rules changed.
- Compact avatar/status strip on phones; player panels outside the board on wide desktop. Local selected character appears for self; opponent uses initial because remote character sync is not implemented.
- Browser checked 390x700 empty/covered/revealed states and desktop layout. Final existing suite: 73 passing. Physical Safari scrolling still needs device feedback.

## Phase 0 of the 2027 redesign (November 2026)
Reference for the redesign: https://www.figma.com/design/KeY08mZ8AcKEfxFJAHAido (plan in REDESIGN-PLAN.md). Phase 0 changes only what the current interface can carry:
- Border colour `--line` raised to 3:1 against surfaces in both themes (light #7a8ca5, dark #5c7aa0). The Duel badge text uses the button ink colour; the light-theme trophy uses a dark amber icon (leaderboard-cup-light.svg); notification counts use the danger colour with button ink.
- The board heading states whether the match is rated; Rated Duel uses the violet accent.
- Invitation banner: 48px buttons, live countdown bar, placed below the header, at the bottom of an open dialog, or as a strip above the current word during a match.
- Motion: newly revealed rows flip tile by tile (420 ms, 90 ms stagger); an invalid word shakes the current row (240 ms). Both are removed by the existing reduced-motion rule.
- In-play header controls are 44px (logo and buttons were 40px). On phones the signed-in Profile control shows the avatar without the word "Profile"; its accessible name is unchanged.
