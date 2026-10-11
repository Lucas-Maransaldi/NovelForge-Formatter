# NovelForge C5.5 — remote popup POC

This is an isolated experiment, not production formatter code. It uses only ordinary DOM APIs and `fetch`; it assumes no LNReader global API. Do not enable it simultaneously with the production contextual click handler. No files outside this directory are changed by this experiment.

## Files and run

- `custom-code/remote-popup.js`: standalone Custom Code, one supported ID (`character:braham`).
- `custom-code/remote-popup.css`: optional visual styling.
- `fixtures/novelforge-c55-remote-popup.epub`: synthetic three-position EPUB generated locally.
- `scripts/build-epub-fixture.mjs`: deterministic EPUB/ZIP generator; uses only Node built-ins and does not access the network.
- `scripts/test-epub-fixture.mjs`: ZIP/EPUB validation and compatibility checks against the actual C5.5 position parser.
- `scripts/test-remote-popup.mjs`: offline headless checks against the real snippet and existing synthetic C5.4 fixtures.
- `results/ANDROID_TEST_RESULTS.md`: repeatable Android test checklist, currently NOT_TESTED.
- `REMOTE_POPUP_REPORT.md`: inspection findings and constraints.

Run `node experiments/lnreader-remote-popup/scripts/test-remote-popup.mjs` and `node experiments/lnreader-remote-popup/scripts/test-epub-fixture.mjs`; root `npm test` also exercises production regressions. In this scoped C5.5.1 change, the global SHA manifest is intentionally not modified, so its dedicated manifest test can report a mismatch for these new files until a separately authorized manifest refresh. Android instructions are in the results file. Do not modify the existing C5.4 fixture or install this over a user's script without backup.

## Generate and import the EPUB fixture

From the repository root, run:

```sh
node experiments/lnreader-remote-popup/scripts/build-epub-fixture.mjs
node experiments/lnreader-remote-popup/scripts/test-epub-fixture.mjs
```

The generator writes `experiments/lnreader-remote-popup/fixtures/novelforge-c55-remote-popup.epub`. It contains only synthetic prose and semantic markers, no remote knowledge facts. Its two spine chapters provide three taps: chapter 889/block 42, chapter 900/block 4, and chapter 900/block 5. The book identifier is `nf-overgeared-poc`, matching the POC's configured expected ID.

Copy/import this EPUB into LNReader as a local book. For an isolated test, back up existing Custom Code, disable the production formatter/popup, enable only `custom-code/remote-popup.js`, and optionally apply `remote-popup.css` through a styling mechanism you have verified in your version of the app. Ensure network access for the online run. In chapter 889 tap Braham in block 42; then chapter 900 block 4; finally block 5. Use the popup's copied diagnostic and screenshots to record results. Restore the prior Custom Code afterwards. The embedded chapter/block attributes are explicit metadata in XHTML; whether LNReader preserves these specific attributes/elements in its sanitized chapter DOM remains an Android verification item, not a headless guarantee.
