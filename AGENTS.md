# Required interface safeguards

These requirements apply to every change in this repository. Do not remove or weaken them without explicit user approval. They preserve the user's approved interaction principles; they do not freeze every visual detail.

## Header
- Navigation controls must not overlap, clip, extend beyond the viewport, or cover the logo or profile.
- On phones the leaderboard is a trophy icon with an accessible Leaderboard name and a minimum 44 by 44 CSS pixel tap target. Do not restore its visible desktop label on phones.
- Keep the profile reachable at the right of the header. Test both signed-in and signed-out states and the visible Back state.
- When space is insufficient, adapt the layout or use accessible compact controls. Never hide overflow to conceal a collision.

## Mode cards and gameplay
- Keep the approved full-width stacked mode cards. Badge and title must occupy separate grid areas; never absolutely position a badge over text.
- Titles must not break mid-word. Badges must remain readable and must not clip.
- Preserve board and keyboard priority during play, stable tile sizing and alignment, accessible exit controls, and reduced-motion preferences.

## Required release evidence
- For header or responsive CSS changes, inspect browser renders at 320, 390, 768 and 1366 CSS pixel widths, including relevant navigation states. Check 200% desktop zoom or its equivalent constrained viewport.
- Inspect the actual screenshots and element bounds. Confirm at least 44px interactive targets, no intersecting controls, no clipped text and no horizontal overflow. A screenshot of Figma does not validate browser CSS.
- Failed measurements block a claim of success. Fix the issue and repeat the affected checks before publishing. If a browser check cannot run, report that limitation rather than claiming verification.
- Unit tests and a successful build do not prove visual correctness. Never dismiss a reproducible CSS collision as caching without evidence.
- Prefer editing the owning CSS rule and removing conflicts over adding increasingly specific overrides. Preserve accessible names when visible text becomes an icon.

These instructions reduce regressions but cannot guarantee that all future changes will comply. Keep release evidence honest and reviewable.
