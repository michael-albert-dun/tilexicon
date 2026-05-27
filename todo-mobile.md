# Mobile Todo

Wordomino is currently being tuned around desktop play. These mobile-specific
interaction questions are worth revisiting before treating the interface as
portable.

## Interaction Risks

- Hover title: mobile has no reliable hover state, so the title hint is mostly
  unavailable. This is fine while the hint is nonessential; onboarding or help
  should carry any important explanation later.
- Double-click gestures: double-tap can conflict with browser zoom, tap delay,
  or platform expectations. Double-clicking a locked grid tile to pick up a
  group may need a touch-specific alternative.
- Backspace dependency: mobile keyboards are usually not open during board play,
  so Backspace should not be the only path for any important action.
- Drag-select: `touch-action: none` should help, but fingers may obscure tiles
  and make drag selection imprecise. This needs real device testing.
- Mini tiles: the visual mini tiles are below comfortable touch-target size.
  Row-level interaction is acceptable, but the row hit area should stay generous.
- Clear and Reset proximity: Reset is destructive for the current board, so the
  mobile layout may need more separation, softer emphasis, or confirmation.

## Possible Mobile Direction

- Keep drag-to-select as the primary fast interaction.
- Replace reliance on double-click and Backspace with touch-friendly row actions.
- Consider tapping a completed mini-row to make it active, then showing a small
  delete affordance.
- Consider a long-press alternative for picking up a completed group from the
  main grid.
- Move explanatory details into an onboarding/help mode rather than the main
  play surface.
