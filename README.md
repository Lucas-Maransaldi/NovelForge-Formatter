# NovelForge Formatter v0.5.0 — release candidate

NovelForge Formatter is an independent presentation script for local EPUB chapters in LNReader. Visual formatting works without network access. The contextual encyclopedia uses the configured Remote Knowledge endpoint online-only, with a volatile cache of validated resources for the current script session. It is not an official LNReader project and is not affiliated with the LNReader developers.

The formatter consumes NovelForge semantic markup (`data-nf-*`) already present in a compatible EPUB. It does not classify narrative text, rewrite the novel, or add semantic annotations. Features therefore require a compatible EPUB.

## Features

- Styles existing QUEST and SYSTEM windows while avoiding a second visual SYSTEM panel nested in a window.
- Embeds its CSS in one self-contained script: `dist/novelforge-lnreader.js`.
- Retains the C2 contextual-index API for direct consumers; the official LNReader popup uses the C5.6 remote client only and does not fall back to local context data.
- Opens the existing character/event popup with remote `LOADING`, `READY`, `EMPTY`, and `ERROR` states. It validates identity, revision, byte length, SHA-256, schema, and provenance, then filters by numeric chapter/block before rendering.
- Does not query at startup; a remote request starts only on a supported semantic entity tap. Unknown identity/position fails closed while formatting continues.
- Initializes when the host executes Custom Code. It has a finite startup wait, but does not monitor the document continuously.

## Install locally

1. Download or build `dist/novelforge-lnreader.js`.
2. Copy the complete file contents.
3. Open the LNReader Custom Code/Custom Script configuration available in your installed version, paste the JavaScript, and save. Exact menu labels and loading APIs have not been verified; this project does not assume them.
4. Open an enriched EPUB. Remote queries require `data-nf-novel="overgeared"`, numeric `data-nf-chapter`, `p[data-nf-block="bNNNN"]`, and a supported `data-nf-entity` marker in the rendered DOM.
5. Follow [the Android validation checklist](docs/ANDROID_VALIDATION.md) and record actual observations.

The local copy/paste method installs one self-contained JavaScript artifact with CSS embedded. Visual formatting needs no runtime network access; the remote encyclopedia does. Follow [NF-RK-001](docs/contracts/NF-RK-001.md), [the publication procedure](docs/REMOTE_KNOWLEDGE_PUBLISHING.md), and the Android checklist before relying on contextual data.

## Development

Requires Node.js 18 or newer:

```sh
npm test
npm run build
npm run manifest:verify
```

After reviewing intentional file changes, regenerate hashes with `npm run manifest:generate`, then run `npm run manifest:verify` and the tests again. The public manifest excludes the retained local-only reference fixtures listed in `.gitignore`.

## Repository layout

- `src/`: formatter, contextual index/UI, remote knowledge client, and minimal adapter.
- `scripts/`: reproducible build, hash manifest, and standalone LNReader diagnostic.
- `tests/fixtures/`: synthetic fixtures for public tests. Four original reference fixtures remain local and are excluded from the public distribution.
- `dist/novelforge-lnreader.js`: primary self-contained distribution artifact.
- `docs/`: contracts, installation, diagnostics, release, and Android validation guidance.

## Compatibility and limitations

Version 0.5.0 is a release candidate, not a stable release. No real Overgeared Knowledge dataset is published in this repository; remote production requests therefore fail safely until authorized data is published. Node tests do not establish Android/WebView compatibility. Real-device confirmation is still required for bundle execution, metadata preservation, HTTPS/CORS, and filtering against an immutable production revision. Visual formatting remains independent of the remote endpoint.

The license has not been selected; see [LICENSE status](docs/RELEASE_CHECKLIST.md). Do not redistribute the local-only reference EPUB or narrative fixtures without appropriate authorization.
