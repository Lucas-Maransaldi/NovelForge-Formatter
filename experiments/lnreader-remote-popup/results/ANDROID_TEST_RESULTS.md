# C5.5 Android validation

Status: **NOT_TESTED**. No Android/LNReader result is claimed for this POC.

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

1. Use a disposable LNReader Custom Code slot. Back up existing code before replacing anything.
2. Disable the production NovelForge formatter/contextual popup for this isolated run; do not enable both click handlers together.
3. Add `custom-code/remote-popup.js` as the sole experimental Custom Code. The CSS is optional presentation styling; if the host cannot load a separate CSS field, paste it into its supported style field only after confirming that mechanism in the actual app.
4. Open the synthetic C5.5 EPUB (documented in the report), connect to the internet, and run the taps above. Save screenshots and copied diagnostic.
5. Restore the prior Custom Code from backup. Do not test with the real Overgeared EPUB or present the synthetic fixture as production identity proof.

The code references the existing public `@main` C5.4 fixtures. Pinning a commit is preferable for reproducibility; this POC does not pretend `@main` is immutable.
