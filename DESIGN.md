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
