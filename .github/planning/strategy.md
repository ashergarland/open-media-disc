# OMD strategy

This document is the strategic north star for Open Media Disc. It explains who
OMD serves, the gap it fills, how adoption can begin before dedicated hardware
exists, and how the open format relates to a sustainable hardware business.

It guides decisions in [`ROADMAP.md`](./ROADMAP.md), the idea catalog, and future
format work. It is not a normative format contract. The current contract remains
in [`../../spec/`](../../spec/) until a deliberate spec milestone changes it.

## The strategy in one sentence

**Make the digital-to-physical album experience so good that collectors and
independent artists voluntarily adopt OMD before dedicated hardware exists.**

## The gap

People can buy and own digital albums, but a download usually remains an
intangible folder or archive. Existing physical alternatives each leave a gap:

- Vinyl is satisfying and collectible, but expensive, large, and impractical for
  an individual or independent artist to manufacture in a short run.
- CDs are inexpensive and recoverable, but many artists do not offer them and a
  home-burned disc rarely feels like a finished release.
- MiniDisc provides the compact, protected, personal physical experience OMD
  wants to revive, but players, recorders, and blank media are increasingly rare.
- Generic USB and SD storage is convenient, but it does not naturally present
  itself as an album object.
- Streaming is convenient, but it does not provide durable ownership or a
  user-authored physical artifact.

OMD combines properties that are not well served together today:

1. Ownership of the digital audio.
2. A compact and satisfying physical album object.
3. Affordable DIY creation and short-run production.
4. Honest fidelity and direct file recoverability.
5. An open format that does not depend on one service or manufacturer.

## Anchor users

### Independent artists

An independent artist should be able to turn masters, artwork, credits, and
liner material into a short run of finished physical releases without paying for
a manufacturing minimum or waiting for a pressing plant.

### Collectors

A collector should be able to buy a legally owned digital album, create a
verified physical copy, give it artwork and shelf presence, and play it at home
or on the go. OMD should make that result feel intentional rather than like a
backup disc.

These users reinforce each other. Collectors create grassroots demand and prove
the workflow with existing releases. Artists create official OMD releases and
give the format cultural legitimacy.

## Adoption ladder

### 1. Commodity media and drives

OMD must be useful before any OMD-specific hardware exists. Computers with
compatible optical drives can create, verify, and play OMD releases written to
inexpensive CDs, DVDs, mini DVDs, and other supported media.

A conventional DVD or CD player is not automatically an OMD player. It must
understand the OMD package and supported audio codec. OMD software and future
dedicated devices provide that behavior.

### 2. A compelling software ecosystem

OMD Studio, the SDK, CLI, label tools, and third-party integrations should make
personal creation and artist short runs easy. Important workflows include:

- Digital album to verified physical release.
- Artwork, labels, sleeves, and inserts that look like a finished product.
- Batch creation, writing, numbering, and verification for short runs.
- Rich release material such as credits, lyrics, liner notes, additional
  artwork, animated artwork, and related music video.
- Playback, recovery, migration, and cataloging without a cloud account.

### 3. The OMD cartridge

The eventual OMD cartridge is the flagship physical experience. It adds
protection, compact storage, distinctive artwork, and the insertion and playback
ritual associated with MiniDisc and UMD. Dedicated cartridge drives, portable
players, decks, and writer hardware turn the open software format into a complete
physical ecosystem.

The cartridge is not required for the format to be useful. Grassroots software
and commodity-media adoption must create a reason to manufacture it.

## Ownership, purchasing and discovery ecosystem (2026-10-28)

The long-term product goal is an integrated OMD music ecosystem where:

1. Artists publish a native OMD release with publisher-selected high-quality audio
   presentations, including independently authored stereo, surround and
   immersive mixes when available.
2. Customers discover and purchase an OMD release through a first-party OMD
   website and retain a recoverable, independently playable copy.
3. OMD Player and Studio can browse purchased releases, download and verify
   them, play on compatible equipment, and optionally create CD/DVD/Blu-ray
   or flash-based physical copies without a permanently required cloud account.

A marketplace is a long-term *product* direction, not a core-format dependency.
Third-party implementations, local files and self-authored discs must continue
to work independently of the first-party website.

### Near term: purchased files to OMD

The first customer experience targets people who already buy ordinary
downloadable audio from other sources:

- Import files or purchased download folders, including FLAC, PCM, and other
  supported owned recordings, from sources such as Bandcamp and Qobuz.
- Detect metadata and album structure, verify actual codec, sample rate,
  bit depth and channel layout, and preserve compatible source audio.
- Include optional distinct artist-authored stereo, multichannel, and
  immersive presentations as the future format revision permits.
- Package, validate, play and burn to a selected supported medium.
- Give actionable incompatibility or capacity information; never imply that
  lossy transcoding or surround rendering was part of the original master.

Prioritize an excellent source-to-package-to-player-to-disc experience before
promising frictionless store integrations or dedicated hardware.

### Medium term: music discovery and purchase handoff

Connect listening discovery with ownership via **modular provider
connectors**, not a monolithic retailer integration. A music provider may
implement discovery, purchase-offer search, authorized acquired-file
delivery, or some combination; the actual OMD package format remains
independent of all provider accounts and services.

- With user permission, import music-library albums, favorites and
  selected playlists from Apple Music, Spotify, or other authorized
  discovery connectors as *metadata*, not subscription audio files.
- Support other provider-specific discovery options, including Bandcamp,
  Qobuz and YouTube Music when their permitted APIs or supported
  import/export paths can supply the requested information.
- Normalize those separate provider identities through a shared release
  resolver, without claiming a streaming badge establishes that a
  corresponding purchasable high-fidelity master exists.
- Normalize album/release identities, using MusicBrainz identifiers and
  recording-level ISRC, album UPC, artist/title/year and track lists as
  appropriate. Distinguish editions, remasters, single tracks and full albums.
- Search cooperating retailers or legally accessible catalogs for purchasable
  editions, show source, advertised codec/channel layout, price when verified,
  region and match confidence. Never infer purchasable Atmos just from an
  Apple Music immersive badge.
- Prefer official store APIs or authorized partnerships. Where unavailable,
  provide genuine product links and an explicit manual purchase/download/import
  flow, rather than unofficial account automation or breaking store access
  restrictions.
- After the buyer legitimately downloads files, recognize the download,
  let them review the match, and package it into OMD.

Storefront, login, and account connections must be opt-in, scoped and revocable.
Discovery must function without transferring Apple Music playback rights.
Do not put retailer account credentials into the OMD manifest.

### Long term: first-party artist publishing and OMD commerce

An official site can support artist accounts, verified album assets, signed or
checksum-verifiable downloads, presentation choices, album metadata, purchase
entitlements, and repeat downloads. OMD Studio can serve as the artist's
publisher/uploader as well as the customer's importer. OMD Player can offer
the user's owned library and secure download/cache/play/burn flows.

Payment processing, tax compliance, rights and licensing, fraud controls,
royalty reporting, and account recovery belong to the *store service*, not
the open OMD file format. Artists must have rights to distribute the
presentations they publish. Preserve purchase receipts and authentication
separately from playable packages; no online activation is required for
already-acquired unprotected files.

### Separation of concerns

- **Discovery data:** what a user likes or wants; does not establish ownership.
- **Purchase offers:** what retailers currently claim to sell; must be verified
  and may change by country, date, format or edition.
- **Acquired assets:** files the user downloaded or an artist published.
- **OMD packages:** portable and verifiable music releases and their included
  mixes.
- **Playback:** local/owned OMD audio with capability-aware output, including
  headphone, multichannel PCM, or optional immersive formats.
- **Commerce services:** optional remote accounts, purchases, downloads and
  artist publishing, independent of offline OMD playback.

The starting feature should validate one real end-to-end vertical slice:
*discover an album, find a legitimate purchase offer, acquire/download it,
import, verify, play, and burn*. Discovery-to-purchase can use a manual
retailer handoff until sanctioned API integration is practical.

Connector architecture: [music-acquisition-architecture.md](./music-acquisition-architecture.md).
Discovery, store offers, and acquired-asset import are independently versioned
roles. The future OMD Store may implement all roles without making its account
mandatory for ordinary offline music packages.

Related design: [multi-presentation audio proposal in draft PR #2](https://github.com/ashergarland/open-media-disc/pull/2).
The preferred implementation is subject to feasibility validation, and a
marketplace must not become a blocker for the near-term album workflow.

## Format and hardware relationship

The OMD release format should remain open, inspectable, and implementable without
official hardware. Optical discs and the future cartridge are physical bindings
and product experiences for that release format, not permission gates around it.

Official OMD hardware can lead through product quality rather than permanent
format exclusivity:

- Reliable cartridge and drive manufacturing.
- Strong industrial design and integrated software.
- Compatibility testing and certification.
- Artist relationships, distribution, support, and economies of scale.
- Trusted reference devices that provide the best OMD experience.

Third-party readers, writers, and players expand the ecosystem and should be
treated as evidence that the open-format strategy is working.

## Product scope

OMD is a music-release format. Its purpose is not to become a generic archive
format. A release may be richer than audio tracks alone, including artwork,
credits, lyrics, liner notes, animated artwork, and music videos that belong to
the release.

Standalone movies and general video are not part of the next core format. A
separate video profile may be considered later if it serves a distinct unmet
need. Supporting every media type is not itself a goal.

## Strategic tests for future decisions

When choosing between designs or milestones, prefer the option that:

1. Makes digital-to-physical album creation easier or more satisfying.
2. Helps independent artists produce credible short runs.
3. Makes OMD useful before dedicated hardware exists.
4. Preserves plain-file recoverability and long-term ownership.
5. Lowers the barrier for third-party software and hardware.
6. Strengthens the eventual cartridge experience without making it a gate.

If a feature serves none of these tests, it should not displace work that does.

## Decisions still under review

This strategy does not pre-decide the next format version. The spec discussion
continues in [`format-direction.md`](./format-direction.md). Important questions
still include identity, editions, provenance, short-run numbering, representation
details, and migration from the current contract.
