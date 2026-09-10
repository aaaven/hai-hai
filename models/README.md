# face-api.js models

This folder contains only the two models used by the browser controller:

- `tiny_face_detector_model-weights_manifest.json` and `tiny_face_detector_model-shard1`: face detection.
- `face_expression_model-weights_manifest.json` and `face_expression_model-shard1`: facial-expression category estimates.

Keep each manifest and its corresponding shard together, with these exact filenames. The supplied weights are unchanged. See `../THIRD_PARTY_NOTICES.md` for upstream provenance and licensing.
