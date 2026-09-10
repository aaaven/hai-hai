# Third-party notices

The project MIT license applies to original Hai-hAI code. The following bundled components retain their own licenses.

| Component | Version / provenance | License and local notice |
|---|---|---|
| p5.js | 1.11.7; the supplied full source file is retained unchanged | LGPL-2.1; `lib/licenses/p5-LGPL-2.1.txt` |
| face-api.js | 0.22.2; supplied minified file is byte-identical to the tagged upstream distribution | MIT; `lib/licenses/face-api-MIT.txt` |
| Tiny Face Detector / Face Expression models | Supplied face-api.js weight manifests and shards; retained unchanged | Upstream face-api.js MIT notice; `lib/licenses/face-api-MIT.txt` |
| simplex-noise | 2.4.0, identified by the supplied distribution header | MIT; `lib/licenses/simplex-noise-MIT.txt` |
| p5.EasyCam | 1.2.3, pinned to freshfork commit `89ec0ac795d949b6265055eec1af1dd6cee17de9` (p5.js 1.x-compatible) | MIT; `lib/licenses/easycam-MIT.txt` |

Upstream sources:

- p5.js source and license: https://github.com/processing/p5.js/tree/v1.11.7
- face-api.js distribution, weights and license: https://github.com/justadudewhohacks/face-api.js/tree/0.22.2
- simplex-noise: https://github.com/jwagner/simplex-noise.js
- EasyCam source and license: https://github.com/freshfork/p5.EasyCam/tree/89ec0ac795d949b6265055eec1af1dd6cee17de9

Only active dependencies are included in this upload folder. Unused model archives and p5.sound have been removed from the project; this notice does not relicense those archived materials.
