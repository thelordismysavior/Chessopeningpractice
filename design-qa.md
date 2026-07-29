# LINE/64 design QA

- Source visual truth: `line64/line-64-preview.png`
- Primary implementation captures:
  - `.scratch/line64-redesign/qa/line64-home-1440x900.png`
  - `.scratch/line64-redesign/qa/line64-drill-1440x900.png`
  - `.scratch/line64-redesign/qa/line64-practice-390x844.png`
  - `.scratch/line64-redesign/qa/line64-settings-390x844.png`
- Source pixels: 1440 × 5295
- Desktop implementation pixels: 1440 × 2093 full-page capture at a 1440 × 900 CSS viewport
- Mobile practice implementation pixels: 390 × 1199 full-page capture at a 390 × 844 CSS viewport
- Density: device scale factor 1 throughout; no density normalization required
- Theme: fixed dark LINE/64 theme
- State: empty/new learner Home, Drill launcher, Beginner Teach practice, Settings open

## Full-view comparison evidence

The 1440px Home capture was reviewed alongside the complete supplied design-system preview. It
preserves the source composition and identity: cool near-black void, graphite cards, bone display
type, slate supporting copy, sparse recall-green accents, mono instrument labels, quiet hairline
borders, restrained radii, and generous section rhythm. Home uses the agreed product hierarchy
rather than reproducing design-system showcase chrome.

The 390px practice capture was reviewed alongside the source's phone practice preview. Both keep
the board as the dominant object, attach the Eval Bar to the board region, use a compact line
identity, lead with one instructional state, and reserve green for the guide and active state.
The implementation intentionally uses persistent primary navigation instead of the reference's
manual Learn/Drill switch, matching the confirmed product brief.

## Focused region comparison evidence

The mobile practice and Settings captures were inspected at original resolution, where board
coordinates, pieces, guide route, typography, dividers, active navigation state, form controls,
and bottom-sheet spacing remain legible. Separate crops were unnecessary because the full-width
390px captures expose those regions at 1:1 density.

## Required fidelity surfaces

- Fonts and typography: passed. Charter/Iowan/Georgia display fallbacks, Segoe UI body text, and
  monospace metadata reproduce the source hierarchy, weight contrast, tight display leading, and
  state-label treatment without remote fonts.
- Spacing and layout rhythm: passed. The desktop shell uses the source's broad negative space and
  bounded content measure. Practice remains one column at all sizes; its board is capped by both
  column width and viewport height so short desktop windows remain operable.
- Colors and visual tokens: passed. Background, surface, foreground, muted, border, and accent
  tokens map directly to the source OKLCH palette. Accessibility-sensitive muted text is slightly
  brighter than the export by prior agreement.
- Image quality and asset fidelity: passed. The product UI contains no photographic or illustrative
  assets to recreate. The supplied preview remains the visual source; chess pieces are existing
  domain-native board content rather than replacement UI icons.
- Copy and content: passed. Navigation and interface prose use LINE/64's declarative voice while
  course names, explanations, attribution, scoring meaning, and progression language remain intact.
- Icons and affordances: passed. Visible controls use labels and the same minimal back treatment as
  the source; no decorative emoji, fabricated illustration, or placeholder imagery was introduced.
- Responsiveness: passed at 390 × 844 and 1440 × 900 captures, plus automated no-overflow checks at
  narrow widths. The bottom navigation and Settings sheet adapt without obscuring reachable content.
- Accessibility: passed automated contract checks for semantic navigation, labeled controls,
  disabled-state meaning, keyboard focus, 44px targets, reduced motion, and horizontal overflow.

## Findings

No actionable P0, P1, or P2 visual differences remain.

## Comparison history

1. Initial browser pass found P2 pointer reachability drift on short desktop windows: the 680px
   board could place lower ranks below the viewport, destabilizing click and drag input.
   - Fix: bound the board by available viewport height while retaining the agreed centered
     one-column layout.
   - Post-fix evidence: drag lift, completion focus, save recovery, and the full 44-flow browser
     suite pass; `line64-practice-390x844.png` confirms the mobile board remains dominant.
2. Initial Settings pass found a P2 selector/affordance ambiguity because both Close and Done were
   form-close buttons.
   - Fix: made the header Close control explicit and independently bound while keeping Done as the
     form completion action.
   - Post-fix evidence: all Settings and Tempo Cut browser flows pass;
     `line64-settings-390x844.png` shows a clear sheet hierarchy.
3. Final source-to-implementation comparison found no further P0/P1/P2 mismatches.

## Browser verification

- Primary interactions tested: Home/Learn/Drill/Review navigation, Drill selection, locked levels,
  line filters and walker, practice click and drag, guide policy, review runs, Settings, progress
  reset, authentication states, save recovery, and Tempo Cut.
- Console errors checked in the desktop Home/Drill and mobile practice/Settings capture journeys:
  none.
- Automated browser result: 44 existing stubbed flows passed; 2 LINE/64 visual-contract flows
  passed.

## Follow-up polish

No blocking polish remains. A future branded application icon could extend the LINE/64 lockup into
native launcher surfaces if a dedicated asset is supplied.

## Implementation checklist

- [x] Source tokens mapped
- [x] Full product shell and routes redesigned
- [x] One-column practice preserved across viewports
- [x] Responsive navigation and Settings implemented
- [x] Accessibility and reduced motion preserved
- [x] Browser interactions and console checked
- [x] Source and implementation visually compared

final result: passed
