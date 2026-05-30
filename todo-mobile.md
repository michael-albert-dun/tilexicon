# Mobile Todo

Tilexicon is currently being tuned around desktop play. These mobile-specific
interaction questions are worth revisiting before treating the interface as
portable.

## Interaction Risks

- Hover title: mobile has no reliable hover state, so the title hint is mostly
  unavailable. This is fine while the hint is nonessential; onboarding or help
  should carry any important explanation later.
- Double-click gestures: double-tap can conflict with browser zoom, tap delay,
  or platform expectations. The visible `x` affordance for completed words
  should be the primary mobile delete path.
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
- Test whether the completed-word `x` affordance is large and clear enough on
  phone screens.
- Move explanatory details into an onboarding/help mode rather than the main
  play surface.

## Testing on iPhone

To test on an iPhone on the same Wi-Fi as the Mac, find the Mac's active local
IP. On this machine the active interface is currently `en1`:

```sh
ifconfig en1
```

Look for the `inet` line. For example, `inet 192.168.0.237` means the local IP
is `192.168.0.237`. If `en1` is not active, run `ifconfig` and look for the
active interface with an `inet 192.168...` or `inet 10...` address.

Then serve the project on all interfaces:

```sh
cd /Users/ma/code/javascript/tilexicon
python3 -m http.server 8010 --bind 0.0.0.0
```

Open Safari on the iPhone at:

```text
http://<mac-ip>:8010/
```

For attached-device debugging, connect the iPhone by cable and enable Safari's
developer tools on the Mac: Safari -> Settings -> Advanced -> Show features for
web developers. Then use the Develop menu to inspect the Tilexicon page on the
iPhone.
