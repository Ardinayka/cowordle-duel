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

## Approved changes (November 2026)
The owner approved the 14 rule changes listed on the "Rule changes to approve" page of the redesign file (https://www.figma.com/design/KeY08mZ8AcKEfxFJAHAido) and in REDESIGN-PLAN.md. They take effect phase by phase:
- Now: every new or changed control is at least 48×48 CSS px. The one written exception is the on-screen letter keyboard (10 keys per row), which keeps at least 44px height. Existing controls stay at least 44px until they are rebuilt.
- Now: release evidence also covers both themes at each required width, and 200% text size.
- Phase 2 (built November 2026): navigation is a top bar plus a bottom tab bar (Play, Friends, Inbox, Ranks, Me; a left rail from 768 px). The Header rules above now apply to the top bar and the tab bar together; the phone trophy-icon rule is replaced by the labelled Ranks tab. The stacked cards on Play are the four ways to play (Competitive, Normal, Play a friend, Practise vs bot); the mode cards remain as the game picker. Badge/title separation and no mid-word breaks still apply to both.
- Phase 3: ranked Duel becomes best of 3 words with a 45-second clock, no ready check, and sign-in required.
