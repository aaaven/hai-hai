# Technical reference

[Back to the home-experience guide](../README.md)

Implementation, operation and publishing notes for the Hai-hAI software component. Paths below are relative to the repository root.

## Run the experience

1. Open the published `index.html` page over HTTPS, or serve the repository root using a local web server. For example, if Python 3 is installed, run `python3 -m http.server 8000 --bind 127.0.0.1` in the repository root and visit `http://127.0.0.1:8000/`.
2. Select **Open camera controller**. If a popup is blocked, use **Open in a tab**.
3. In the controller, select **Start camera**, allow camera access, and wait for model loading.
4. Keep both views open in the same browser profile. Face the camera; the abstract visualization responds to the category estimates through the simulation.
5. Select **Stop camera** to release the camera. Closing the controller also stops capture. The last simulated state is held in the visualization.

The camera image includes the article-style overlay: global Valence, Arousal, V′, A′, Mood V and Mood A, plus a face box with that face's VA coordinates and seven category estimates. The numeric readouts below the image use the same update. A timing line reports actual completed detection updates per second and the camera's reported frame rate.

Do not open these pages directly as `file://` documents. Camera access and model fetching need a suitable web origin. Each fresh visualization URL receives a session identifier; use its generated controller link so the two views match. To run another independent instance, open the original site URL without the session query.

The view animates at its zero-initialized state before a camera is connected. A moving visualization alone does not indicate active emotion detection: check its connection status.

## Publish with GitHub Pages

To make an independent copy, create a new repository named `hai-hai` (or another available name) and upload this folder's contents. Keep `index.html` at the repository root, not inside an extra enclosing folder. Keep the `lib`, `models`, `js`, `vizjs`, and `docs` directories and the license notices intact; only the active models and libraries are included. The application does not need code changes when the repository name changes.

In the repository's **Settings → Pages**, select **Deploy from a branch**, choose the intended branch (usually `main`) and **/ (root)**, then save. Use HTTPS. No server-side application, build service, API key, npm installation, or database is needed to run the site. `.nojekyll` keeps this a plain static site.

A repository called `hai-hai` under `aaaven` would normally have a Pages URL of `https://aaaven.github.io/hai-hai/`. If the account already uses a custom domain for its user site, project sites can inherit that domain; use the exact URL shown under **Settings → Pages → Visit site**. Models and scripts use relative paths, so the same files also work under another project subdirectory or a domain root. Enable Pages separately for the new repository and select **Enforce HTTPS** when available. See GitHub's [publishing-source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [custom-domain guidance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages). Publication is not performed by this folder itself.

After deployment, test the actual HTTPS URL in a fresh browser session and grant camera permission again. Permissions for localhost do not transfer to the published origin.

## What runs where

- `index.html`: p5.js/WebGL visualization of the symbolic AI.
- `control.html`: camera preview, emotion detection, VA/mood computation, and diagnostic category estimates.
- `js/affect.js`: the single source of truth for the VA prototypes and response/mood equations.
- `js/session.js`: instance-specific same-origin communication.
- `js/camera-overlay.js`: camera-image coordinates, category estimates, and face boxes.
- `vizjs/computeParams.js`: artist-defined visual mappings.
- `vizjs/InstancedParticles.js`: batched rendering of the existing sphere/box particles.
- `models/`: the tiny face detector and expression model, each with its manifest and weight shard.

The views use BroadcastChannel, not a remote connection. The controller opens independently, without an opener dependency, to avoid tying its processing to the visualization's busy window. Open one controller per visualization session. A phone and a different computer will not exchange states merely by opening the same link. Use the same browser on one computer; an extended desktop lets the second display show only the visualization while the controller remains on the operator's screen.

## VA prototypes and response

| Category | Valence | Arousal |
|---|---:|---:|
| Happy | 0.8 | 0.5 |
| Sad | -0.6 | -0.3 |
| Angry | -0.5 | 0.6 |
| Fearful | -0.6 | 0.6 |
| Disgusted | -0.6 | 0.4 |
| Surprised | 0.4 | 0.7 |
| Neutral | 0.0 | 0.0 |

These are the simplified implementation prototypes used in the revised manuscript, not exact psychometric measurements. Per-face nonnegative category weights are normalized and used to form a weighted VA input. If multiple faces are detected, their VA inputs contribute equally to the mean.

The artist-defined response is computed component-wise as `VA′ = 1.2 × VA + 0.1 × sign(VA)`. Accumulated mood starts at `(0,0)` and uses the exponential moving average `M = 0.95 × previous M + 0.05 × VA′` once per completed update with at least one face. The alpha is per update, not per elapsed second; responsiveness in seconds depends on inference speed. Detection is limited to at most 20 non-overlapping updates per second.

When no face is detected, face boxes and category labels clear, while the system-value overlay and the last response and mood are held; no additional EMA update is applied. Stopping and restarting the camera within the same controller preserves mood. Reloading the controller resets it. No mood history is stored across visits.

## Visual mapping policy

Internal VA′ and mood values are not clipped. For display only, inputs are bounded to `[-1,1]`, and signed arousal is converted to activation with `(a + 1) / 2`. Visual rates, jitter, deformation, and opacity then use bounded nonnegative ranges. This lets low-arousal states remain visible rather than producing negative opacity or distortion.

The original hue endpoints are retained: HSB 188 (cyan, negative valence) and HSB 0 (red, positive valence). The reversed range clamp has been corrected. Intermediate hues, brightness, saturation, and mood-dependent lighting contribute to the appearance. These are artistic mappings, not a universal color code for emotions.

The visualization targets 30 frames per second. All 100 orbital elements and 80 particles per element are retained. Where instanced rendering is supported, the particles in each orbital are drawn together: about 100 shape draw calls per frame instead of 8,000. The existing sphere/box meshes, lighting and color mappings are retained. A slower individual-particle fallback remains for older graphics support. The adapter targets the bundled p5.js 1.11.7; re-test it before changing that library.

Animation timing is elapsed-time-based. Camera capture requests 30 fps as a preference, not a guarantee; detection remains capped at 20 non-overlapping updates per second. The original low observed detection rate was caused by rendering contention, not this cap alone. See [VALIDATION.md](../VALIDATION.md) for a bounded before/after measurement. Actual performance depends on the camera, device, browser and graphics implementation.

## Exhibition mode

Start the camera controller first. On the visualization page, select **Exhibition mode** to enter browser fullscreen. The canvas fills the screen; the header, buttons, connection text, footer and cursor are hidden. The orbital visualization keeps its proportions. In the home setup, fullscreen fills the small TV, not the surrounding wall-shadow composition. Press **Esc** to leave fullscreen and restore the interface.

Keep the controller running in its separate window, ideally visible on an operator display. Enter exhibition mode on the display showing the artwork. Fullscreen requires a supported browser and a user click; if it is unavailable or refused, the normal interface remains available with a message. The camera feed and its diagnostics are not included in the exhibition view.

## Privacy and practical limits

This application processes camera frames locally, does not record or upload them, and does not request audio. Numerical simulated states are sent only between the paired local browser views. Model files and scripts are downloaded from the site host, which can retain normal access logs. Camera permission remains under the visitor's control.

A current desktop browser with WebGL, camera support, and BroadcastChannel is recommended. The layouts resize for smaller screens, but mobile browsers can pause background tabs or interrupt capture; physical iOS/Android devices and every browser have not been certified. Do not rely on this artwork for psychological assessment, diagnosis, or consequential decisions.

If models fail to load, check that the two manifest files and two weight shards are present and that their requests succeed under the published project path. If camera permission is refused, allow access in site settings and retry. If the visualization reports that the controller is disconnected or paused, return to that controller or reopen it using the paired link.

## Development tests

The browser application has no installation/build step. With Node.js 20 or later available, `npm test` (or `node --test tests/*.test.cjs`) runs numerical, visual-range, JavaScript syntax, and asset-integrity checks using built-in modules only. Browser integration tests were also performed during preparation; see [VALIDATION.md](../VALIDATION.md) for their scope and limitations.

## License and dependencies

Original Hai-hAI code is released under the MIT license in [LICENSE](../LICENSE). Bundled libraries and model files retain their upstream licenses; see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) and `lib/licenses/`. MIT for this project does not replace the licenses of those components.
