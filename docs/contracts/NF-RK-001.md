# NF-RK-001 — Remote Knowledge Contract

**Version:** 1.0.0
**Status:** implementation contract for the C5.6 release candidate. It does not imply that any production knowledge dataset has been published or Android-validated.

## 1. Scope and identifiers

The contract transports spoiler-filtered character/event knowledge from a fixed NovelForge GitHub repository to the LNReader Custom Code. It never transports knowledge in the EPUB and never changes the narrative.

- Production book ID: `overgeared`. Experimental ID `nf-overgeared-poc` is not accepted by the production client.
- XHTML carries the stable book ID in the existing `article.nf-chapter[data-nf-novel]` attribute. Title, file name, URL, or LNReader state are not identity sources.
- Entity IDs are `character:<slug>` or `event:<slug>`, where the slug matches `[A-Za-z0-9][A-Za-z0-9._-]{0,79}`. The visible anchor text is the label; the server-provided display name/aliases are not used by this version.

## 2. XHTML metadata and reading position

Remote requests require all of:

```html
<article class="nf-chapter" data-nf-novel="overgeared" data-nf-chapter="889" data-nf-schema="1">
  <p data-nf-block="b0042"><a data-nf-entity="character:braham" href="...">Braham</a></p>
</article>
```

For remote queries `data-nf-chapter` must be 1–9 decimal digits; `data-nf-block` must be `b` followed by 1–9 decimal digits. Parse the numeric portions as base-10 integers, never lexicographically. `data-nf-novel`, `data-nf-chapter`, and the nearest containing `p[data-nf-block]` must be present in the rendered DOM. Any missing, ambiguous, unsupported, or invalid position fails closed. Existing local `chapterId` values are not silently reinterpreted as remote order.

The formatter does not add or infer these attributes. The enrichment producer must set them and validate their preservation in the target reader. If absent, visual formatting continues and the remote popup shows an unavailable state without fetching knowledge.

## 3. Discovery and immutable content revision

The only mutable discovery document is:

`knowledge/v1/books/overgeared/latest.json`

Its schema is `nf-rk-discovery/1`:

```json
{
  "schemaVersion": "nf-rk-discovery/1",
  "bookId": "overgeared",
  "revision": "og-r0001",
  "contentCommit": "<40 lowercase hexadecimal Git commit ID>"
}
```

The formatter reads `latest.json` only from the configured HTTPS repository URL. `contentCommit` is validated and then used to construct every content URL. It is never accepted as an arbitrary URL or path. `main` is a mutable discovery pointer only; manifest and entity data are requested under the exact commit ID, so a query cannot mix content from different commits.

## 4. Manifest schema

After the user taps a supported entity already marked in the visible XHTML, fetch only that entity's manifest at the pinned commit, schema `nf-rk-manifest/1`:

```json
{
  "schemaVersion": "nf-rk-manifest/1",
  "bookId": "overgeared",
  "revision": "og-r0001",
  "entities": {
    "character:braham": {
      "entityId": "character:braham",
      "resourcePath": "entities/character/braham/data.json",
      "byteLength": 123,
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  }
}
```

The URL is `knowledge/v1/books/overgeared/entities/<type>/<slug>/manifest.json`. The manifest must contain exactly one entry: the requested `entityId`; the `revision` must match discovery. This per-entity shape intentionally prevents a manifest from enumerating hidden/future entity IDs. Its map key must equal `entityId`; `resourcePath` must equal `entities/<type>/<slug>/data.json`. Traversal, absolute paths, arbitrary origins, query strings, fragments, extra entities, and unsupported entity types are rejected. Resource requests use the same pinned commit as the manifest.

## 5. Knowledge resource schema

Each entity resource uses `nf-rk-knowledge/1`:

```json
{
  "schemaVersion": "nf-rk-knowledge/1",
  "bookId": "overgeared",
  "revision": "og-r0001",
  "entityId": "character:braham",
  "facts": [
    {
      "id": "stable-fact-id",
      "text": "Fact text supplied by the authorized index producer.",
      "revealedAt": { "chapter": 889, "block": 42 },
      "provenance": { "chapter": 889, "block": 42, "blockId": "b0042" }
    }
  ]
}
```

The example fact is schema illustration, not Overgeared content. `facts` are ordered by numeric `(chapter, block)`. Fact IDs are unique within the entity resource. Text is non-empty and at most 4,000 UTF-16 code units. Chapter/block are non-negative safe integers. Provenance is mandatory and must agree exactly with `revealedAt`; `blockId` must parse to the same numeric block. Invalid, absent, out-of-order, duplicate, or inconsistent records invalidate the entire resource; partial data is never displayed.

## 6. Limits, integrity, and trust

- Discovery: maximum 4 KiB; per-entity manifest: 32 KiB; entity resource/SHA-256 input: 64 KiB (same cap as the audited C5.4.1 fallback); exactly one entity per manifest; 2,000 facts per entity.
- Requests are absolute HTTPS to `cdn.jsdelivr.net` with credentials omitted, CORS mode, redirects rejected, and a 12-second timeout. No relative URL, JSONP, dynamic script, `eval`, external import, localStorage, IndexedDB, service worker, or persistent application cache is used.
- Resource `byteLength` and SHA-256 are checked against the manifest over the exact response bytes before UTF-8/JSON parsing. Web Crypto is attempted; the audited C5.4.1-compatible pure-JavaScript SHA-256 fallback is used when unavailable.
- The trust anchor is the configured NovelForge repository identity plus WebView TLS validation of the configured HTTPS CDN origin. The immutable Git commit reference ensures revision consistency; SHA-256 verifies bytes against the manifest. Neither is presented as a publisher signature or independent proof against compromise of the repository/CDN trust chain.
- CDN propagation/cache behavior can delay discovery updates. Rollback changes only `latest.json` to a previously published revision; already pinned commits remain addressable.

## 7. Antispoiler and public API behavior

The query input is `{bookId, entityId, chapter, block}`. Missing or invalid context is an error. A fact is returned only when `fact.chapter < current.chapter`, or when chapters are equal and `fact.block <= current.block`. The comparison is inclusive and numeric. Filtering happens in the client after resource integrity, schema, identity, and provenance validation. The public result contains only permitted fact records; future fact text/IDs are not returned to the popup. Every new position is filtered again, including cache hits.

Errors are structured as `{ok:false,error:{code,message}}`; successful results are `{ok:true,value:{schemaVersion,bookId,revision,entityId,facts}}`. UI messages are generic and do not include remote error text or future data.

## 8. Cache and online-only policy

Only fully validated manifest/revision and entity resources may be cached, in memory for the lifetime of the loaded script. The entity cache key includes book ID, revision, immutable commit, and entity ID. It contains unfiltered validated source facts; each call re-applies the temporal filter. Cache is not shared between books and is not persistent. A validated in-memory resource may answer later clicks in the same script session; this is not a guarantee of offline operation. With no valid memory entry and no network, return `ERROR`. There is no fallback to the embedded C2.1 index in the production popup.

The visual formatter is independent of the network and initializes normally if identity, manifest, or service is absent.

## 9. Producer and publication responsibilities

The authorized producer supplies only sourced facts, stable IDs, explicit provenance, sorted revisions, and a validated manifest. It must not infer missing source chapters, copy the synthetic C5.4 fixture into production, or rewrite narrative text. Publishing a revision is an explicit operation: validate candidate files; commit immutable manifest/entity resources; obtain that commit ID; update the mutable discovery pointer in a subsequent commit; validate the pointer and rollback target. The Formatter is read-only and never writes to GitHub.

The EPUB, incremental index update, discovery pointer, and validation report are separate artifacts and must be checked for matching `bookId`, entity IDs, revision, and temporal boundaries before publishing. No production Overgeared entity resource currently accompanies this contract; until one is intentionally published, the request is expected to fail safely as unavailable.
