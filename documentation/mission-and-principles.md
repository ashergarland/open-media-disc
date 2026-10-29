# OMD Mission, Vision, and Founding Principles

**Status:** Proposed canonical public product positioning, for review.
**Direction selected:** Music Ownership Reimagined + Music Without Compromise,
supported by The Open Music Standard + The Future of Physical Music.
**Scope:** Long-term mission and product definition. It does not imply that all
described capabilities have shipped.

## Mission

**To restore genuine music ownership by empowering artists to publish their
recordings in the highest quality available and giving listeners the freedom
to discover, purchase, experience, and preserve music permanently.**

## Positioning

**Open Media Disc — Music Ownership Without Compromise**

**Candidate tagline:** Own the music. Preserve the experience.

### The promise

**Music you purchase should be yours to keep. Its quality should be
preserved. Its future should not depend on the company that sold it.**

## Product vision

Open Media Disc (OMD) is an open-source, DRM-free music format and ecosystem
that combines lasting digital ownership, exceptional audio fidelity, and the
tangible experience of physical music.

OMD enables artists to publish premium albums with original stereo,
high-resolution, multichannel, and immersive audio presentations. Listeners
can acquire music through participating retailers or a future OMD marketplace,
play it on compatible equipment, and create personal physical editions on
optical discs and other storage media.

OMD is built on open specifications, independently implementable software,
and verifiable, recoverable files. Purchased music should never require a
subscription, online activation, or a functioning OMD marketplace for ordinary
offline playback. The format itself imposes no artificial limits on playing,
copying, backing up, ripping, or burning legitimately acquired music, subject
to applicable copyright and purchase rights.

## The four pillars — with business priority

| Pillar | Weight | Promise |
| --- | --- | --- |
| **A. Music Ownership Reimagined** | Primary business mission | Buy music to keep it, with independent offline playback and preservation |
| **D. Music Without Compromise** | Primary premium differentiation | Artists can publish distinct high-quality mixes; listeners can hear supported originals without unnecessary reduction |
| **B. The Open Music Standard** | Technical foundation | Public format, openly implementable core tools and interoperable player ecosystem |
| **C. The Future of Physical Music** | Distinctive customer experience | Writable, verifiable, collectible albums using existing and future physical media |

The pillars are **complementary**, not competing product lines. Ownership and
fidelity define why listeners and artists choose OMD. Openness and physicality
give that promise credibility and a distinctive product experience.

## Product definition

OMD is an ecosystem made of related but separately implementable layers:

1. **OMD Release Format:** A versioned, verifiable, portable album package
   containing audio, manifest metadata, checksums, and optional artwork,
   liner notes, editions, and other supporting materials. The next format
   revision is being designed for multiple publisher-selected audio
   presentations; the current implemented draft does not support that model.
2. **OMD Player:** Open-source reference playback for local and physical
   releases; high-fidelity and multichannel output where the actual decoder
   and device capabilities support it, with clear source/output diagnostics.
3. **OMD Studio:** Open-source authoring, edition preparation, artwork/labels,
   packaging, validation, import, disc writing, verification, and recovery.
4. **Music Discovery & Acquisition:** Open connector interfaces linking
   consenting listeners' music interests to legally purchasable downloadable
   editions and authorized local/imported assets. Third-party stores and
   artists retain independent distribution choices.
5. **OMD Marketplace (future):** Optional first-party commercial site
   enabling rights-cleared artists to publish, and customers to purchase and
   retain ordinary verified OMD releases. No store login or continuing service
   should be required to keep using legitimately acquired offline files.
6. **Physical OMD Ecosystem (future):** Cartridge media, dedicated players,
   writers, portable devices, and accessories built on the same open format.
   Physical media are a flagship experience, never an exclusive gate.

OMD is **not** a promise that any audio codec or channel layout will work on
every playback device. Playback capabilities must be honestly advertised and
incompatible presentations handled explicitly.

## Founding principles (product decisions must follow these)

### 1. Real ownership is foundational

Users must be able to retain, inspect, back up and use legitimately acquired
compatible releases independently of OMD's marketplace, publisher accounts,
a recurring subscription or cloud availability. Online services add value;
they do not grant continuing permission to play locally owned files.

### 2. DRM-free by design

The OMD format has no mandatory audio encryption, copy counters, playback
expiration, online activation, device pairing or technical limit on personal
playback, ripping or burning. Store infrastructure may use encryption for
security, but ordinary acquired albums remain usable without store-controlled
decryption keys. Respect lawful copyright and license restrictions;
DRM-free is not permission for public redistribution.

### 3. Preserve the artist's original intent and fidelity

The publisher may supply separately authored stereo, surround and immersive
presentations. Preserve supplied original audio where supported rather than
unnecessarily re-encoding it. Distinguish original mixes from computational
downmixes, upmixes and headphone spatialization. Never claim that converted
audio is an independently mastered original, or that a source has quality
properties that have not been measured or verified.

### 4. The format remains open and interoperable

Specifications, validation rules, reference libraries, Player, Studio and
connector contracts should be openly implementable. Independent software
and hardware can interoperate without official OMD approval to use the
format. Proprietary licensed decoders may be optional components when
necessary and legally permitted, never a secret dependency for basic playback.

### 5. Artists decide how their music is published

Artists and rightsholders choose which recordings, mixes, editions and
supporting materials to include and may use their own distribution channels.
Open OMD software does **not** change the copyright status of the recordings
or grant distribution rights over other people's music.

### 6. Physical editions are a first-class experience

A listener can turn a legally acquired digital album into a tangible,
verifiable, customized release: write, label, catalog, collect, play, rip,
restore and rewrite where media permit. Support commodity discs and
removable storage alongside future distinctive cartridges. The experience
matters more than optical-storage novelty alone.

### 7. Files should outlast services

Packages must remain inspectable and recoverable with ordinary tools. Preserve
historic format specifications, versioning, test fixtures and migration
paths so older releases can remain accessible. Signed provenance may help
authenticate originals but must not block otherwise compatible unsigned
releases or legitimate derivative packages.

### 8. The customer controls integrations

Discovery and store integrations are modular, opt-in and removable. An account
on Apple Music, Spotify, Bandcamp, Qobuz or a future OMD Store must not become
an intrinsic dependency of the format. No account tokens, purchase receipts or
private user activity belong in the portable release manifest by default.

### 9. Earn revenue through service, not artificial restrictions

The OMD business may charge for rights-cleared music purchases, artist
publishing/fulfillment, optional hosted services and official hardware. It
must not charge merely to unlock ordinary playback, personal backups, ripping
or burning of a compatible release. The first-party store competes through
catalog, trust, convenience and artist relationships.

### 10. Transparency is more important than marketing claims

Say what a package actually contains, which renderer/device is in use and
which playback capabilities are optional or unsupported. Distinguish
**implemented today**, **prototype**, and **long-term intent**. Avoid claims
that OMD replaces conventional CDs, streaming services or generic flash
storage at tasks where those systems remain better.

## Product tests for proposed features

Every new feature should answer:

- Does it strengthen genuine ownership or long-term recoverability?
- Does it improve faithful access to an artist's music without misrepresenting
  source or playback quality?
- Does it preserve independent, DRM-free use of locally acquired packages?
- Can an open-source or third-party implementation interoperate without a
  private first-party dependency?
- Does it make personal physical edition creation more compelling and
  accessible, when relevant?
- Does it benefit artists and listeners without weakening their rights
  or introducing an unnecessary account, codec, or device lock-in?

A feature that undermines the foundational DRM-free ownership commitment
should not enter the core format, even if it could improve near-term licensing
or revenue opportunities.

## Implementation and governance note

This is a **mission and decision framework**, not a revised normative package
schema, a launch commitment, a new software license, a trademark registration,
or a grant of rights to artists' recordings. Actual audio implementations,
store integrations and hardware are staged work.

The existing MIT software license remains unchanged. For commerce boundaries
and rights-related review, see [Business Model](./business-model.md) and the
[open platform business strategy](../.github/planning/open-business-model.md).
For the current product and technical state, refer to
[Project Status](./project-status.md) and [Package Format](./package-format.md).

The physical-release thesis builds on the original writable-cartridge concept:
discovery, lawful acquisition, authored physical edition, collection, playback
and reusability. The mission expands that thesis to durable music ownership
and artistic fidelity across media rather than replacing it.
