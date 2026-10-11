# C5.5 Android validation

Status: **NOT_TESTED for C5.5.1 fixture**. The earlier user-provided Android result for a different EPUB reported `bookId=overgeared`, `chapter=poc-source-unknown`, and `metadata=FAIL`; this synthetic fixture is intended to address that mismatch but has not yet been tested on Android. No Android success is claimed.

Record before testing: date, LNReader version, Android version, device, network, exact script revision, EPUB file hash, screenshots, and copied diagnostics. For each point below record PASS/FAIL/UNKNOWN with evidence:

- Custom Code runs with only this POC enabled; the production formatter is disabled.
- Tap `character:braham`: default XHTML navigation is prevented and LOADING appears immediately.
- At chapter 889/block 42, only fact-001 and fact-002 appear.
- At chapter 900/block 4, fact-003 is absent; at 900/block 5 it appears.
- Unsupported entity and ordinary link retain normal navigation.
- Close during load; rapid repeated taps; chapter change; re-execution do not show stale facts or duplicate UI.
- Copy diagnostic reports HTTP, bytes, SHA implementation/result, schema and allowed/blocked IDs without fact text.
- Repeat offline after one successful load: this experiment intentionally has session-memory-only cache, but reload/re-execution may clear it; do not call this persistence.

## Procedure

1. Generate and validate the synthetic book from the repository root: `node experiments/lnreader-remote-popup/scripts/build-epub-fixture.mjs` then `node experiments/lnreader-remote-popup/scripts/test-epub-fixture.mjs`.
2. Import `experiments/lnreader-remote-popup/fixtures/novelforge-c55-remote-popup.epub` as a local book. Use a disposable LNReader Custom Code slot. Back up existing code before replacing anything.
3. Disable the production NovelForge formatter/contextual popup for this isolated run; do not enable both click handlers together.
4. Add `custom-code/remote-popup.js` as the sole experimental Custom Code. The CSS is optional presentation styling; if the host cannot load a separate CSS field, paste it into its supported style field only after confirming that mechanism in the actual app.
5. Connect to the internet and test, in order: chapter 889/block 42; chapter 900/block 4; chapter 900/block 5. Verify allowed IDs are respectively `fact-001,fact-002`, `fact-001,fact-002`, and `fact-001,fact-002,fact-003`; these expected IDs come from the unchanged remote C5.4 fixture. Save screenshots and copied diagnostics. Also test the ordinary navigation link and confirm it is not intercepted.
6. Restore the prior Custom Code from backup. Do not test with the real Overgeared EPUB or present the synthetic fixture as production identity proof.

After each tap, specifically check whether the LNReader-sanitized DOM still exposes `article.nf-chapter[data-nf-novel][data-nf-chapter]`, `p[data-nf-block]`, and `a[data-nf-entity]`. If the sanitized DOM drops or rewrites these markers, record the actual diagnostics and stop; do not infer a successful parse from EPUB source alone.

The code references the existing public `@main` C5.4 fixtures. Pinning a commit is preferable for reproducibility; this POC does not pretend `@main` is immutable.
