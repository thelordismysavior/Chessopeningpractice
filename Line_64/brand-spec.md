# LINE/64 Brand Spec

Dark cool boards, calm Segoe UI hierarchy, and mono state detail. Bone carries primary actions; green is reserved for board hints.

```css
:root {
  --bg: oklch(15% 0.012 255);
  --surface: oklch(20% 0.014 255);
  --fg: oklch(92% 0.012 110);
  --muted: oklch(66% 0.018 245);
  --border: oklch(30% 0.016 250);
  --hint: oklch(82% 0.15 155);
}
```

- Display: `"Segoe UI", system-ui, -apple-system, sans-serif`.
- Body: `"Segoe UI", system-ui, -apple-system, sans-serif`.
- Mono: `ui-monospace, "SFMono-Regular", Consolas, monospace`.

Posture:

1. The board is the primary image and largest object.
2. Each practice screen asks for one decision.
3. State stays attached to the position.
4. Bone carries primary actions and focus; green appears only on board hints.
5. Pills are controls; 20px surfaces contain bounded groups.
6. Motion is learner-controlled and otherwise absent.
