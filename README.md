# NovelForge Formatter v0.4.0 — preview

NovelForge Formatter is an independent, offline presentation script for local EPUB chapters in LNReader. It is not an official LNReader project and is not affiliated with the LNReader developers.

The formatter consumes NovelForge semantic markup (`data-nf-*`) already present in a compatible EPUB. It does not classify narrative text, rewrite the novel, or add semantic annotations. Features therefore require a compatible EPUB.

## Features

- Styles existing QUEST and SYSTEM windows while avoiding a second visual SYSTEM panel nested in a window.
- Embeds its CSS in one self-contained script: `dist/novelforge-lnreader.js`.
- Reads a chapter-scoped contextual index embedded in the rendered DOM, when available.
- Offers character/event contextual UI and exposes facts only through the C2.1 temporal query API. Missing, invalid, mismatched, or insufficiently positioned data fails closed.
- Initializes when the host executes Custom Code. It has a finite startup wait, but does not monitor the document continuously.

## Install locally

1. Download or build `dist/novelforge-lnreader.js`.
2. Copy the complete file contents.
3. Open the LNReader Custom Code/Custom Script configuration available in your installed version, paste the JavaScript, and save. Exact menu labels and loading APIs have not been verified; this project does not assume them.
4. Open a compatible local EPUB chapter and check the visual result. For contextual data, confirm that `#nf-context-index` survives rendering.
5. Follow [the Android validation checklist](docs/ANDROID_VALIDATION.md) and record actual observations.

The local copy/paste method is the recommended first test and works without runtime network access. An optional remote-loading method is discussed in [distribution notes](docs/DISTRIBUTION.md), but has not been implemented or verified and is not required.

## Development

Requires Node.js 18 or newer:

```sh
npm test
npm run build
npm run manifest:verify
```

After reviewing intentional file changes, regenerate hashes with `npm run manifest:generate`, then run `npm run manifest:verify` and the tests again. The public manifest excludes the retained local-only reference fixtures listed in `.gitignore`.

## Repository layout

- `src/`: formatter, contextual index/UI, and the minimal adapter.
- `scripts/`: reproducible build, hash manifest, and standalone LNReader diagnostic.
- `tests/fixtures/`: synthetic fixtures for public tests. Four original reference fixtures remain local and are excluded from the public distribution.
- `dist/novelforge-lnreader.js`: primary self-contained distribution artifact.
- `docs/`: contracts, installation, diagnostics, release, and Android validation guidance.

## Compatibility and limitations

Version 0.4.0 is a preview for validation, not a stable release. Node tests do not establish Android/WebView compatibility. In particular, the project still needs real-device confirmation that LNReader reruns Custom Code on each chapter opening and preserves the embedded index and semantic attributes in its rendered DOM. Without the index, the visual formatter continues to work while contextual queries stay unavailable.

The license has not been selected; see [LICENSE status](docs/RELEASE_CHECKLIST.md). Do not redistribute the local-only reference EPUB or narrative fixtures without appropriate authorization.
