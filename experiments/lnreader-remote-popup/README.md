# NovelForge C5.5 — remote popup POC

This is an isolated experiment, not production formatter code. It uses only ordinary DOM APIs and `fetch`; it assumes no LNReader global API. Do not enable it simultaneously with the production contextual click handler. No files outside this directory are changed by this experiment.

## Files and run

- `custom-code/remote-popup.js`: standalone Custom Code, one supported ID (`character:braham`).
- `custom-code/remote-popup.css`: optional visual styling.
- `scripts/test-remote-popup.mjs`: offline headless checks against the real snippet and existing synthetic C5.4 fixtures.
- `results/ANDROID_TEST_RESULTS.md`: repeatable Android test checklist, currently NOT_TESTED.
- `REMOTE_POPUP_REPORT.md`: inspection findings and constraints.

Run `node experiments/lnreader-remote-popup/scripts/test-remote-popup.mjs` and root `npm test`. Android instructions are in the results file. Do not modify the existing C5.4 fixture or install this over a user's script without backup.
