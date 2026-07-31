# LINE/64 Design System Workspace

Reusable design system extracted from the Web Prototype source project. The package documents and demonstrates the source-faithful Android chess opening practice language.

## Product overview

The source product is LINE/64, an Android-first chess opening recall tool. Its primary surfaces are Learn, Drill, review queue, settings, and design documentation. Its core capabilities are board interaction, guide control, move confirmation, settled score, banked progress, and due review state.

LINE/64 serves one learner practicing a personal chess opening repertoire. Learn and Drill are the primary board surfaces. Review rows and settings support the loop without competing with the position. The product generates a 64-square accessible board, reveals or withholds a move guide, accepts move selection, reports a Settled Score, tracks banked progress, and exposes due review state.

## Start here

1. Open `preview/index.html` for the review card index.
2. Open `preview/applied-ui.html` for the interactive practice surface.
3. Read `DESIGN.md` for rules and `colors_and_type.css` for portable tokens.
4. Copy `ui_kits/app/` when prototyping a product screen.

## Package contents

```text
.
|-- DESIGN.md
|-- README.md
|-- SKILL.md
|-- brand-spec.md
|-- colors_and_type.css
|-- assets/
|   |-- README.md
|   `-- line-64-source-preview.png
|-- context/
|   |-- provenance.md
|   `-- source-context.md
|-- preview/
|   |-- index.html
|   |-- manifest.json
|   |-- shared.css
|   |-- colors-primary.html
|   |-- typography-specimens.html
|   |-- spacing-tokens.html
|   |-- radius-shadows.html
|   |-- components-buttons.html
|   |-- components.html
|   |-- brand-assets.html
|   `-- applied-ui.html
|-- ui_kits/app/
|   |-- README.md
|   |-- components/
|   |   |-- Board.jsx
|   |   |-- Feedback.jsx
|   |   `-- ModeSwitch.jsx
|   |-- index.html
|   `-- styles.css
|-- line-64-design-system.html
|-- line-64-design-system-2.html
`-- line-64-preview.png
```

## Preview cards

| Preview | File | Review focus |
| --- | --- | --- |
| Index | `preview/index.html` | Package overview |
| Colors | `preview/colors-primary.html` | Bone primary and board-hint green tokens |
| Typography | `preview/typography-specimens.html` | Display, UI, and state roles |
| Spacing | `preview/spacing-tokens.html` | 4px rhythm and named gaps |
| Radius and shadows | `preview/radius-shadows.html` | Shape roles and hard offset |
| Buttons | `preview/components-buttons.html` | Primary, secondary, and ghost actions |
| Components | `preview/components.html` | Feedback, review row, and line meter |
| Brand assets | `preview/brand-assets.html` | CSS mark and preserved source |
| Applied UI | `preview/applied-ui.html` | Working practice kit |

## How to use this package

This is a reusable Claude Design package for source-faithful LINE/64 work.

Source context references, package contents, preview cards, preserved assets, fonts, build artifacts, `ui_kits/app/`, and the concrete reuse workflow are listed below.

- Source context: read `context/source-context.md` and `context/provenance.md`.
- Package contents: use `DESIGN.md`, `SKILL.md`, and `colors_and_type.css`.
- Preview cards: begin with `preview/index.html`, then open the focused card for the changed foundation.
- Preserved assets: retain `assets/line-64-source-preview.png` and both root source HTML files.
- Fonts: no bundled files exist; preserve the platform font stacks.
- Build artifacts: no runtime icons exist; add `build/` only when real runtime files enter the source.
- Applied UI kit: copy `ui_kits/app/` as the working product baseline.
- Review workflow: import tokens, implement from the app kit, compare focused previews, then run the package audit.

## Source context

Read `context/source-context.md` for the handoff and `context/provenance.md` for extraction decisions. The two root HTML files are the substantial preserved source examples.

## Preserved assets, fonts, and build artifacts

The two root HTML files remain preserved as substantial source examples. The screenshot is copied into `assets/` for package-relative previews. No runtime logo, icon, or font files existed in the evidence, so the kit keeps the CSS grid mark, Unicode chess pieces, and platform font stacks.

## UI kit

Import `colors_and_type.css`, then follow the component contracts in `DESIGN.md`. The app kit uses only native HTML, CSS, and JavaScript.
