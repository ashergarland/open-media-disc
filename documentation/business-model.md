# Open Media Disc: Open Platform, Commercial Services

**Status:** Adopted product and business direction, not a description of
currently available commercial services. The product and licensing details
below are subject to implementation, contract and legal review.

## The idea

Open Media Disc (OMD) should be a widely usable, open music format and software
ecosystem. A listener can buy or legally acquire an album, preserve its original
audio and accompanying artwork, package it, play it on compatible hardware, and
optionally burn it to physical media. Artists should be able to publish
high-quality albums, including different studio-authored stereo, surround and
immersive presentations when supported.

**The format and the tools necessary to use it independently stay open. The
business earns revenue by offering an excellent optional place to find, buy,
publish, deliver and manage music.**

The official OMD website is a future commercial service, not a licensing server.
A purchased package remains locally playable and recoverable without its store,
an active subscription, a continuing business relationship or a particular
hardware vendor.

## What stays open

| Component | Intended policy |
| --- | --- |
| Format specification, manifest schema, extension mechanism and conformance fixtures | Public, openly implementable |
| Packaging, verification, import/export and disc-writing SDK/CLI | Open-source reference implementation |
| OMD Player and Studio, including basic album creation, playback, verification and burning | Open source |
| Decoding/output abstractions and reference spatial/headphone rendering paths | Open where third-party licenses permit; optional proprietary integrations are clearly identified |
| Discovery, purchase-offer and acquired-file connector interfaces | Public and openly implementable |
| Reference connectors that use permitted public APIs, links, or local files | Prefer open source |
| Offline read/play/burn workflows and standard-package recovery | No mandatory sign-in, license server or paid activation |

Neither artists nor listeners need an official OMD account simply to create,
read, play or burn their own compatible OMD packages. Other stores and
developers may distribute or support the format without becoming OMD resellers.
An official OMD player is not the only conforming player.

## What may remain proprietary or rights-controlled

| Component | Intended policy |
| --- | --- |
| First-party OMD storefront and checkout backend | Proprietary hosted business service |
| Artist accounts, financial records, payouts, taxes and fraud controls | Private commercial operations |
| Purchase entitlements, download delivery and optional cloud library services | Proprietary services, with published client integration contracts where useful |
| Retailer/label agreements, negotiated rates, business intelligence and sensitive operations | Confidential or contract-controlled |
| Official hardware industrial design, manufacturing, fulfillment and services | May be commercial/proprietary, without restricting independent format compatibility |
| OMD brand, logos and official certification marks | Brand-owner controlled, with a clear future trademark policy |
| Artists' recordings, artwork and associated release rights | Controlled by their respective copyright holders, not made open merely by use of OMD |

The website's public-facing client may later be open or closed; no decision
about that particular front-end implementation is necessary now.

## How the business can earn revenue

**Primary opportunity: a first-party OMD music marketplace.** Artists and
rights holders publish native OMD editions; customers purchase portable
packages. OMD earns a transaction commission or other agreed fee for the
marketplace, discovery, fulfillment and support. The commission rate and
artist payout structure have **not** been selected.

Possible additional revenue includes optional hosted backups/sync and
redownload convenience, managed artist/label distribution and short-run
physical fulfillment, official players/cartridges/accessories, and support
or certification services. These offerings must add convenience or value,
rather than make an otherwise valid OMD file unusable without payment.

## Adoption sequence

1. **Now: make owned audio usable.** Let customers import purchased downloadable
   albums, inspect actual codec/channel facts, package, validate, play and
   burn them. Support enhanced presentation formats as the format revision and
   decoder work mature.
2. **Next: connect discovery to ownership.** Modular discovery providers
   (Apple Music, Spotify, YouTube Music and others) supply legally accessible
   music-interest metadata. Store providers (Bandcamp, Qobuz, Beatport,
   immersive-audio specialists and others) provide authorized purchase offers
   or reliable deep links. Purchased-file import works independently of store
   account APIs.
3. **Later: native artist publishing and the OMD store.** Rights-cleared artists
   upload OMD editions, customers buy and re-download them, and OMD Player
   supports authenticated retrieval and fully offline playback after download.
4. **Eventually: premium hardware and services.** Dedicated portable players,
   writer docks, cartridges and physical accessories can provide a polished
   branded experience without preventing competing implementations.

A provider can implement discovery, store offers, purchased-file delivery or
more than one role. The **connector protocol stays open**; the first-party OMD
store should use that same published integration surface rather than require
a private file extension or secret player capability.

## Trust boundaries

- **Ownership:** The package is recoverable using ordinary tools. After a
  permitted file download, normal local playback and burning do not call home.
- **Interoperability:** The core format is publicly documented. Additional
  multichannel and immersive codecs are optional, openly declared capabilities,
  including when proprietary third-party components or licensing are needed.
- **Privacy:** Streaming-service preferences and retailer credentials stay in
  opt-in connector/account storage, never embedded in the release manifest.
- **Artists' rights:** Copyrighted recordings are not open source because the
  tools are. Selling an album on the future store requires appropriate rights.
- **Neutral ecosystem:** Other stores, hardware makers and independent player
  authors can participate; the first-party service competes on catalog quality,
  reliability, convenience and artist relationships, not forced lock-in.

## Licensing and governance

The existing OMD codebase is licensed under [MIT](../LICENSE). This strategy
**does not change that license**. MIT permits third-party commercial reuse;
a competing proprietary player can be built from MIT code subject to the license
terms. The proposed direction is to retain permissive licensing for reference
libraries and applications where practical.

Before commercial launch, decide how to handle outside contributions, ownership
and any contributor certification, the explicit license for standard documents
and conformance fixtures, the trademark/brand-use policy, and any third-party
audio codec obligations. Software licenses, trademarks, patents and artists'
content rights are different issues. A trademark policy can distinguish
official products from compatibility claims without charging for format use.

**This page is a product strategy, not legal advice, a new license, a
registration of a trademark, or a promise of specific commercial terms.**

## Related work

- [OMD overview](./what-is-omd.md)
- [Project roadmap](./roadmap.md)
- [Business implementation strategy](../.github/planning/open-business-model.md)
- [Music acquisition and native-store planning](https://github.com/ashergarland/open-media-disc/pull/3)
- [Multiple audio presentations proposal](https://github.com/ashergarland/open-media-disc/pull/2)
