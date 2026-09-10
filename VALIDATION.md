# Validation record

Tested on 10 September 2026. This records local preparation checks, not certification of the live GitHub Pages site or a study of emotion-detection accuracy.

## Automated checks: 17 passed

Run `node --test tests/core.test.cjs` from this directory. The tests use Node's built-in modules and cover:

- All seven revised VA prototypes, their amplified responses, and their first mood updates.
- Category-weight normalization, equal weighting of multiple faces, and empty/invalid inputs.
- The fixed 0.05 EMA contribution.
- 4,096 combinations of signed input and mood values, including amplified extremes: finite visual parameters, bounded color/opacity, nonnegative controls, and no mutation of internal affect values.
- Hue variation with valence and visibility of the corrected negative-arousal Sad state.
- Exact-case HTML asset paths, required model tensor/shard lengths, and JavaScript parsing.
- All six camera-overlay system values, per-face VA/category labels, and removal of face-specific labels when no face is present.

These checks passed in the single current upload folder.

## Browser integration checks: 20 passed

Environment: Chrome 152.0.7977.83 on macOS, automated headless browser, synthetic camera. The current upload folder was served beneath `/hai-hai/`; requests outside that project prefix returned 404. A separate root-path smoke/performance check also succeeded.

1. Visualization starts beneath the project path without automatically opening a popup.
2. The controller opens from a user click, uses the matching session, and leaves the camera off initially.
3. Delayed model downloads complete before inference begins.
4. All model requests remain within the project path and succeed.
5. Two-face estimates produce the expected mean VA input.
6. The corrected Sad response reaches the paired visualization and remains visible.
7. Loss of faces clears face boxes/category labels, retains the held system-value overlay, and does not overlap inference jobs.
8. Stop camera releases all capture tracks.
9. Independent instances do not exchange states.
10. A closed controller is reported as disconnected.
11. Narrow-screen layout and enlarged text do not create horizontal overflow.
12. Camera denial produces an actionable message and retry succeeds.
13. A missing model produces an actionable message, releases the camera, and can be retried after the file becomes available.
14. A blocked popup leaves a working paired controller link.
15. No uncaught browser errors or external application requests occur in these scenarios.
16. Batched rendering and individual-particle rendering agree within a pixel-difference tolerance, using the same random seed and state; the full set of 8,000 particles is retained.
17. The live camera overlay shows the system values and per-face data; the controller has no opener dependency.
18. Exhibition mode fills the fullscreen viewport and hides the page controls, footer and cursor without graphics errors.
19. Escape exits exhibition mode and restores the normal controls.
20. A refused fullscreen request restores a usable normal interface with an explanation.

Real bundled models were loaded and exercised against synthetic camera frames. Deterministic model-output fixtures were then used for the multiple-face and Sad-state integration checks; those checks do not validate inference accuracy on real faces. Camera-denial and missing-model failures were intentionally simulated.

Desktop visualization, the restored camera overlay at desktop and 390-pixel widths, and fullscreen exhibition screenshots were visually inspected for legibility, layout, and a visible Sad response.

## Performance comparison

Two five-second samples used the same Chrome build, synthetic camera, local server and normal visualization layout, with the controller opened through the page button:

| Measurement | Before this repair | After this repair |
|---|---:|---:|
| Visualization frames per second | 9.0 | 30.0 |
| Mean time inside the drawing function | 112.2 ms | 9.0 ms |
| Completed detection updates per second | 1.4 | 19.6 |

The camera was a synthetic 20 fps source. Bundled detection models ran against its frames, not a real face. Pausing the earlier visualization restored detection to about 20 updates/s, and a separately opened controller also avoided the severe slowdown. This supports rendering contention as the cause in this test. The repair combines an independent controller window and batched particle draws; it does not change the VA prototypes or add smoothing to category estimates.

These are short local measurements, not a hardware-independent performance promise, a benchmark on real faces, or a sustained exhibition test. The visualization still targets 30 fps and detection remains capped at 20 completed updates/s. Physical-camera testing is still required.

## Still required after publication

- Open the actual GitHub Pages HTTPS URL in a fresh browser session; verify loading, camera permission, and the paired views with a physical camera.
- Check the intended installation computer, camera, lighting, display arrangement, and sustained rendering performance.
- Test other browsers and physical mobile devices if they are part of the intended audience. Background-tab restrictions may affect the two-view experience on mobile.

No repository was uploaded and no live deployment was performed during this preparation. The online software does not implement physical shadow casting.
