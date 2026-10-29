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

## Connector architecture: independent discovery, acquisition and delivery

OMD should define small, versioned connector contracts rather than one
integration per store with a hard-coded all-in-one interface.

**A provider may implement any subset of the three connector roles:**

1. **`MusicDiscoveryConnector`:** read-only user interests or permitted
   catalog metadata. Import saved/favorite albums, tracks, artists, playlists,
   and optionally catalog search. Never treat subscription media as owned files.
2. **`MusicStoreConnector`:** retrieve real product/edition offers and
   documented purchase links, with region and advertised formats. A store
   connector does not need to perform checkout or file download. Even an
   unauthenticated link-only catalog is useful when grounded and permitted.
3. **`MusicAcquisitionConnector`:** ingest user-selected local downloads, or
   retrieve purchased assets only through an authorized delivery API. It hands
   verified local assets to the common OMD importer. This must never scrape
   private account data or automate restricted checkout/download mechanisms.

**Shared services, not connectors:** `ReleaseResolver` matches a streaming
catalog album to recording/release/edition identifiers; `OfferAggregator`
queries enabled store providers; `AudioInspector` probes the actual local
files; `OMDPublisher` packages files into the standardized OMD release.
No provider-specific identifier, account token, URL, or purchase entitlement
is required by the OMD manifest.

A single provider can register multiple connector roles. For example,
Bandcamp may provide discovery or product links and a separately authorized
download workflow; Spotify is a discovery provider, not an OMD-download source.
The future first-party OMD store can offer catalog search, purchasing,
authorized OMD-package delivery, and artist publishing without forcing the
other connectors to adopt those interfaces.

### Conceptual SDK shape (not implemented)

```ts
type Capability =
  | "catalog.search"
  | "library.read"
  | "favorites.read"
  | "playlists.read"
  | "offers.search"
  | "offers.openPurchaseLink"
  | "purchases.authorizedDownload"
  | "files.import";

interface ConnectorDescriptor {
  id: string;
  displayName: string;
  apiVersion: string;
  roles: Array<"discovery" | "store" | "acquisition">;
  capabilities: Capability[];
  requiredPermissions: string[];
}

interface MusicDiscoveryConnector {
  descriptor: ConnectorDescriptor;
  searchCatalog?(query: string): Promise<MusicCandidate[]>;
  getSavedMusic?(cursor?: string): Promise<Page<MusicInterest>>;
  getFavorites?(cursor?: string): Promise<Page<MusicInterest>>;
  getPlaylists?(cursor?: string): Promise<Page<PlaylistSummary>>;
}

interface MusicStoreConnector {
  descriptor: ConnectorDescriptor;
  findOffers(release: ResolvedRelease, region: string):
    Promise<PurchaseOffer[]>;
}

interface MusicAcquisitionConnector {
  descriptor: ConnectorDescriptor;
  importLocal?(input: SelectedFiles): Promise<OwnedAssetImport>;
  downloadPurchased?(entitlement: AuthorizedEntitlement):
    Promise<OwnedAssetImport>;
}
```

Types shown above are architectural examples only. Exact data contracts,
promise APIs, auth adapters, pagination, schema versions, packaging and plugin
execution model require design and security review. OMD should not advertise
a connector capability when the provider's permitted APIs cannot satisfy it.

### Capability negotiation, not provider assumptions

A discovery connector may expose only a public catalog search, or only the
playlists an authorized user's account can read. An offer provider may expose
only a deep link rather than price and available audio format. A download
connector may be unavailable even when the same provider offers FLAC purchases.
The UI must differentiate `supported`, `not offered by provider`,
`authorization required`, `temporarily unavailable`, and `unknown`.

Match distinct editions, then show *evidence-backed* offers. Prefer UPC/EAN,
ISRC and release identifiers where valid, with artist/title/year/track-list
verification. Never silently substitute a remix, remaster, deluxe, regionally
different edition or stereo stream for a specific requested multichannel file.

### Provider matrix: target roles, not available implementations

| Provider | Discovery | Store offers | Purchased asset delivery |
| --- | --- | --- | --- |
| Apple Music | Authorized MusicKit library/favorites and catalog | No general portable audio purchase flow from subscription metadata | No subscription audio export |
| Spotify | OAuth user library/playlists and permitted catalog, subject to developer access limits | No general portable music-download store | No subscription audio export |
| YouTube Music | Discovery goal, but native library/favorites API is not confirmed; YouTube Data API can cover some standard YouTube playlists | No general portable audio purchase flow | No subscription audio export |
| Bandcamp | Artist/album links and permissible discovery; general consumer API is restricted | Official album product pages | User-downloaded files initially; authorized partner flow if secured later |
| Qobuz | Catalog/interest discovery subject to approved API access | Official digital album store pages | Official downloads supplied by user initially; approved API if granted |
| Immersive Audio Album | Product discovery where available/authorized | Physical or digital immersive product links | User downloads initially; partner API to investigate |
| Future OMD Store | Native catalog | Native purchase offers | Authorized OMD-package delivery and optional redownload |
| Local folders/ZIP | Existing owned files' metadata | Not a store | `files.import`, fully local |

This matrix is **a proposed integration landscape, not a statement that these
connectors are already implemented**.

### Official API realities (checked October 2026)

- **Apple Music:** MusicKit/Apple Music API supports authorized personal music
  library, favorites, playlists and catalog functionality; developer and
  user authentication are required.
  - https://developer.apple.com/musickit/
- **Spotify:** OAuth and library scopes provide saved-items and playlist data,
  but Spotify tightened **Development Mode** for new apps in February 2026,
  including a five-user cap, an app-owner Premium requirement and changes to
  library endpoints. Commercial distribution/expanded access needs a separate
  eligibility and approval review.
  - https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
  - https://developer.spotify.com/documentation/web-api/concepts/scopes
- **YouTube Music:** Google documents the *YouTube Data API* for video channels,
  playlists and playlist items. Do not assume it exposes all YouTube Music
  saved albums, liked songs or music-specific library functionality. Native
  YouTube Music account sync must be separately verified; begin with
  user-supplied playlists/exports and verified public links.
  - https://developers.google.com/youtube/data/guides/implementation/playlists
  - https://developers.google.com/youtube/documentation
- **Bandcamp:** Its official developer API states access is designed for labels
  and fulfillment partners and requires a request. No unrestricted fan purchase
  or account downloader is assumed.
  - https://bandcamp.com/developer
- **Qobuz:** The published API terms require an app ID/secret granted by Qobuz.
  Do not reverse-engineer client credentials or treat a streaming integration
  as permission to access purchased downloads.
  - https://static.qobuz.com/apps/api/QobuzAPI-TermsofUse.pdf

### Plugin isolation and lifecycle

- Begin with **built-in first-party adapters behind stable interfaces**; an
  externally installable plugin marketplace is not required for version one.
- Give each connector a unique namespace and explicit, versioned capability
  metadata. Consent and auth scope are per connector; failure in one provider
  must not prevent the others from returning results.
- Implement per-provider rate limits, retries/backoff, request timeouts,
  pagination and cached results. Show source and last-checked timestamps.
- Prefer a controlled host API rather than giving third-party plugin code
  filesystem or authentication-token access by default. Review sandboxing,
  signing, secrets storage, updates, and revocation before accepting untrusted
  plugins.
- Downloaded files and account data must never be exposed to discovery/store
  connectors without an explicit need and user authorization. No connector
  may place secrets into an OMD package.
- Each connector should be independently testable with mock fixtures and a
  contract suite; unsupported methods do not become fabricated empty results.

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
