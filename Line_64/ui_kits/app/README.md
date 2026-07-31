# LINE/64 Applied App Kit

Open `index.html` directly. The kit is a working practice surface built with native HTML, CSS, and JavaScript.

- Applied kit structure: one semantic HTML shell, one component stylesheet, and three reusable JSX components.
- Component files: `index.html`, `styles.css`, and `components/*.jsx`.
- Usage workflow: copy the folder, preserve token linkage, replace position data, connect state, and review.
- Design notes: board first, state attached, 44px controls, Bone actions, green hints, and static motion.
- Source basis: the two preserved root HTML files and source screenshot.

## Structure

This reusable applied UI kit documents its source basis, kit structure, component files, usage workflow, design notes, and review breakpoints. Future agents can copy it without reconstructing the board contract.

## Source basis

The kit preserves the board, Learn and Drill mode contract, settled score, guide state, copy tone, touch targets, and CSS-native mark from the two root source HTML files.

## Components

- `index.html`: semantic app shell, dialog, and token stylesheet link.
- `styles.css`: responsive board-first components and local layout.
- `components/Board.jsx`: accessible 64-square board reference.
- `components/ModeSwitch.jsx`: Learn and Drill tab reference.
- `components/Feedback.jsx`: source-voice inline feedback reference.

Included behavior:

- 64 accessible square buttons.
- Learn and Drill mode switching.
- Guide toggle in Learn.
- Tap selection and correct-move feedback.
- Settled score and guide state attached to the board.
- Responsive phone-first layout.
- Reduced-motion support.

## Usage

This applied kit is the reusable Claude Design starting point for LINE/64 product screens.

- Source basis: the preserved root HTML and source screenshot.
- Kit structure: `index.html`, `styles.css`, and three files under `components/`.
- Component files: semantic shell, responsive component CSS, board state logic, and three JSX references.
- Usage workflow: copy the folder, preserve the token link, replace position data, connect state, and review both breakpoints.
- Design notes: board first, state attached, 44px controls, Bone actions, green hints, hard offset only.

1. Copy the complete `ui_kits/app/` folder.
2. Preserve the direct `../../colors_and_type.css` link or update it to the new package-relative path.
3. Replace the example position data in the inline `App` bootstrap.
4. Keep every square as a real labelled button.
5. Connect primary action, mode, and settings state to the product model.
6. Review the result at 320px and above 800px.

## Reuse guide

Copy all three component files together. Keep the token stylesheet link valid, preserve the accessible 64-button board, replace only product data and state connections, then compare the result with `../../preview/applied-ui.html`.

## Design notes

- The board is the largest object and moves above copy below 800px.
- The eval strip and settled score remain adjacent to the board.
- Controls are 44-52px tall with pill geometry.
- Bone marks primary actions and focus. Guide green marks board hints only.
- The only elevation is the board frame's zero-blur hard offset.
- Motion is absent except learner-controlled move animation.

Keep the structure synchronized with `DESIGN.md` and `colors_and_type.css`.
