# OMD Music Acquisition: integration architecture and delivery sequence

**Status:** Strategic implementation design, not a normative spec or shipped
feature. Established user direction on 2026-10-28.
**Related:** [strategy](./strategy.md), [roadmap](./ROADMAP.md),
[INT-14 through INT-16](./ideas/integrations.md),
[APP-12](./ideas/new-apps.md),
[draft multi-presentation spec PR #2](https://github.com/ashergarland/open-media-disc/pull/2).

## Desired customer journeys

1. **Owned files to OMD:** User selects a purchased album download directory
   or archive -> OMD inspects its actual files and channel layout -> metadata
   review -> packages and validates -> plays -> offers burn/write+verify.
2. **Discovery to acquisition:** User optionally authorizes Apple Music access
   or imports an exported playlist -> OMD lists saved/favorited albums -> finds
   potentially purchasable *specific editions* -> user opens a verified store
   listing and checks out there -> user downloads files using the store's
   supported workflow -> OMD imports the downloaded assets as journey 1.
3. **Native OMD commerce (future):** Artist publishes an OMD release to the
   first-party OMD website -> customer purchases -> authenticated customer may
   retrieve an ordinary, independently playable verified package -> OMD
   Player/Studio downloads and caches it locally -> optional disc or flash copy.

Apple Music likes, saved library items and playlists are **music discovery
signals**, not owned sound recordings. Streaming downloads are not valid audio
assets for OMD conversion.

## Proposed module boundaries

| Module | Input | Output | Design constraints |
| --- | --- | --- | --- |
| `MusicInterestSource` | User-authorized MusicKit account or imported playlist | Album/track wish-list metadata | Permission scopes, privacy, no subscription audio extraction |
| `ReleaseResolver` | Artist/title/year/catalog IDs/track list | Candidate edition/recording identities | Recognize remaster, deluxe, live, clean/explicit, track-list differences |
| `PurchaseOfferProvider` | Desired edition identity, country, desired fidelity | Grounded offers with store-specific buy URL | Supported partner API or verified public listing; cannot claim availability from a generic album search |
| `AcquiredFileImporter` | User-selected downloaded files or ZIP | File inventory + metadata and audio facts | Handles ZIP safely; no credential scraping or DRM circumvention |
| `OMDPublisher` | User-approved asset set/track mappings | Valid package + checksum verification | Preserve source, offer mix selection/capacity policy, use actual revised manifest when implemented |
| `OMDPlayback` | Manifest + asset + hardware capabilities | Decoded/converted output and diagnostics | Real decoder support, no unsupported automatic Atmos promises |
| `StorefrontConnector` (future) | Authorized first-party OMD purchase entitlement | Verified package download/caching | Separated from file-format core, account-free offline playback after download |

Separate data **models** from store-specific retrieval **connectors**. Do not
couple OMD release IDs to Apple Music or retailer-specific IDs. Candidate
matches require confidence and provenance. Present any price or edition
claims as verified per provider, with region and date when known.

### Suggested normalized acquisition objects (conceptual)

- `MusicInterest`: source service, source ID, artist, album/track, favorites
  status if present, original catalog URL.
- `ResolvedRelease`: canonical candidate and edition/version identifiers,
  year, track list and optional UPC/ISRC/MusicBrainz links.
- `PurchaseOffer`: retailer, exact product link, retailer edition ID,
  advertised delivery codecs and channels, region, price/currency if
  independently verified, evidence timestamp and match confidence.
- `OwnedAssetImport`: local file set, measured technical metadata,
  relative paths, track mapping, optional original mix labels supplied
  by publisher/user.

Do not let product names or marketing badges substitute for inspecting actual
downloaded assets. `Dolby Atmos` on Apple Music is not evidence the same
master is purchasable in Dolby TrueHD elsewhere.

## Verified initial integration feasibility

- **Apple Music:** MusicKit permits user-authorized library access and exposes
  favorite information on library song attributes. Use a developer token and
  a scoped user token for account-specific requests. A read-only consent-based
  integration is possible, but verify any favorites/albums filtering semantics
  with an actual account. A playlist/CSV import avoids a service dependency for
  first prototype.
  - https://developer.apple.com/documentation/AppleMusicAPI
  - https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit
  - https://developer.apple.com/documentation/applemusicapi/librarysongs/attributes-data.dictionary
- **Bandcamp:** Paid music downloads are available in FLAC and other formats.
  Published developer API access centers on labels and fulfillment partners;
  do not assume a general fan purchase/download API. Start with verified
  product links and user download-folder import.
  - https://bandcamp.com/developer
  - https://get.bandcamp.help/en/articles/15263234-in-which-formats-can-i-download-my-purchases
- **Qobuz:** Purchased music can be downloaded as FLAC and other formats
  through its browser or official downloader, without DRM. Store API use
  requires explicit permitted access; never use unofficial login or cookie
  extraction.
  - https://help.qobuz.com/en/articles/10167-what-are-the-different-audio-formats-available-for-download
  - https://help.qobuz.com/en/articles/369150-download-full-albums-without-qobuz-downloader
- **Immersive Audio Album:** Offers surround and immersive album downloads.
  Catalog/distribution partnership or permission for automated store access
  is not verified. Start with user-supplied purchased assets and direct links.
  - https://immersiveaudioalbum.com/

## Proposed first vertical slice

Build on existing `omd create`, `validate`, `play`, `burn` and Studio.
An implementation milestone should deliver:

- One-click import of a locally downloaded, purchased *stereo FLAC* album
  (folder or ZIP), preserving compatible files and presenting artist/album
  and track metadata for review.
- A package validation and listening path, playable without online service
  connectivity, plus capacity selection and burn/read-back verification.
- An album search box accepting a known Apple Music URL or ordinary
  artist/album title; show at least one real, manually verified purchase
  destination rather than claiming automated catalog integration.
- One end-to-end demo: Apple Music discovery URL -> product page -> legal
  purchase/download (user action) -> import -> OMD package -> playback ->
  target-disc-capacity assessment.

Add a separately tested multichannel case as soon as revised format support
exists: user-supplied native 5.1 FLAC source plus original stereo mix,
manifest selection, actual decoder and downmix/binaural rendering tests.
Do not pretend that a Dolby TrueHD Atmos MKV is ordinary 5.1 FLAC.

**Not in the first slice:** automatic checkout, retailer account credentials,
DRM bypass, third-party subscription audio extraction, unauthorized store
scrapers, first-party customer accounts, payments, artist royalty accounting,
or public upload moderation.

## Follow-on slices

1. Apple Music MusicKit authenticated library/favorite ingest (or robust
   portable export path), local metadata cache and edition resolution.
2. Pluggable store offer matching with human-verified evidence; no promised
   price/capability until grounded.
3. User-consented download-folder handoff, duplicate detection,
   automatic-but-reviewable OMD assembly, and opt-in import convenience.
4. Enhanced audio: publisher-selected native stereo and 5.1/7.1 mixes,
   compatible immersive audio sources, headphone spatial output, and
   available-player diagnostics.
5. First-party OMD store: rights-cleared artist publishing, verified download,
   entitlements, redownload, payments, and secure delivery.

## Product and safety invariants

- The format and offline package/playback never require a first-party account.
- Do not republish purchased commercial music through the future marketplace
  without artist/label distribution rights.
- Store integration respects service API terms, privacy and access controls;
  credentials are never serialized into packages.
- Buying a product is always a user-authorized action; opening a purchase page
  is not a claim of completed checkout.
- Downloaded files, channel layouts and checksums must be inspected and
  verified; do not infer fidelity from a store logo or Apple Music badge.
- Retain alternative codec packaging, presentation and playback strategies
  while spec and real decoder feasibility are tested.
