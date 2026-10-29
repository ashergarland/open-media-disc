# OMD business architecture and licensing strategy

**Decision status:** Strategic direction accepted for planning on 2026-10-28.
**Implementation status:** Not scheduled; no commerce server, first-party
store, fee schedule or rights agreements have been implemented.
**Public explanation:** [Business model](../../documentation/business-model.md).

## Decision record: OSB-1, open platform with optional commercial services

### Context

OMD's differentiator is personal ownership and a credible alternative to
streaming-only access. Customers need a reliable, independently playable format
and production tools; artists need a low-barrier distribution and publishing
path. The long-term vision includes a proprietary first-party music marketplace,
artist publishing, native downloads, hardware and optionally hosted services.

A proprietary playback or authoring dependency would undermine the product's
own claim of durable ownership. Conversely, open-sourcing commercial account
operations, sensitive artist agreements, processing rules and infrastructure
would not be necessary for third-party format interoperability.

### Decision

**Keep the format, basic publishing and offline playback free to implement,
while operating a proprietary first-party commerce/service layer.** Encourage
third-party stores, players and hardware with open specifications and connector
interfaces. The first-party store succeeds through distribution, artist
relationships, catalog quality and convenience, not a secret format extension
or license-server gate.

The current [MIT license](../../LICENSE) stays unchanged. This is a policy for
future repository and product decisions, not a newly imposed software license,
a binding trademark policy or a guarantee of services.

### Scope matrix

| Surface | Default boundary | Notes |
| --- | --- | --- |
| OMD release format, schemas, validation/conformance | Open public standard | Specs sufficiently complete for independent readers and writers |
| Core SDK, CLI, deterministic package creation, verification and burning | MIT open source (current direction) | Third-party integrations and commercial reuse allowed |
| OMD Studio, Player and offline user library | Open source | Basic owned-media processing, playback, copying and disc writing never require store logins |
| Multichannel and binaural rendering / format negotiation | Open interfaces and open implementations where licensing permits | Hardware-dependent and proprietary codec modules may be external/optional |
| Discovery, purchase-offer, acquired-asset connector contracts | Open API/SDK and conformance tests | Provider capability negotiation, no first-party special casing |
| Reference store/discovery connectors | Prefer open source when allowed | Private partnership integrations can remain closed, but do not gate core file use |
| First-party OMD retail catalog, payment, order ledger, customer accounts | Private service | Hosted backend and financial/security operations |
| Seller accounts, artist onboarding, royalties, payouts, tax and compliance | Private service | Includes contractual and personal financial information |
| Fulfillment, download entitlements, optional cloud sync/backup | Private hosted operations | Offer an interoperable download; local use needs no subsequent entitlement check |
| Official hardware, industrial design, premium services | Commercial option | Disclose necessary compatibility information; standard does not require branded hardware |
| Brand names/logos/certification | Controlled trademark/brand policy | Do not assert trademark registration until verified |
| Album masters, artwork, lyrics and music videos | Third-party rights | Artists must have necessary licenses; release contents are not MIT-licensed by default |

**Policy guardrail:** Commercial code may depend on an open OMD SDK and connect
through versioned documented APIs. The open core must never import or rely on
the closed commerce backend for local create/validate/play/burn operations.

### Important licensing nuance

- MIT covers the current repository subject to the exact [LICENSE](../../LICENSE).
  It allows commercial reuse and does not impose source disclosure of derivatives.
- Any separate proprietary backend repository should contain code and assets that
  the project has the rights to keep private. Existing MIT code can generally be
  used there subject to the MIT conditions; contributions, assignments,
  employee agreements and any other code licenses still need review.
- Do not relicense previously distributed or externally contributed work by
  assumption. Consider DCO/CLA policy **before** bringing in substantial
  third-party contributions, especially if later dual licensing is contemplated.
- Publish a separate specification/standards licensing statement only after
  reviewing document reproduction and patent/conformance needs. For now the
  existing LICENSE stays in place; this decision changes no rights.
- A trademark policy should allow accurate compatibility statements by
  others while reserving misleading "official OMD" claims and certification
  marks. Do not conflate trademark with permission to implement the file format.
- Dolby, DTS and other proprietary audio support may require separate licenses
  or platform codecs. Open interfaces must not imply an unrestricted right to
  distribute proprietary decoders.
- A commercial OMD download can contain copyrighted music with its own license;
  the software's MIT terms do not license that music.

## Planned revenue streams and experiments

| Revenue line | Stage | Hypothesis to test |
| --- | --- | --- |
| Native OMD album sales / store take rate | Long term, primary | Artists value ownership-oriented distribution and consumers will pay for audio they retain |
| Optional storage, backups, library sync and redownload conveniences | Later | Collectors pay for convenience without losing offline access |
| Artist publishing tools, managed short-run fulfillment and business support | Later | Artists pay for distribution/fulfillment services beyond the open authoring app |
| Branded players, writer docks, cartridge media and accessories | Later, hardware gated | Physical ritual and manufacturing quality create product margins |
| Business-grade support and certification services | Optional | Manufacturers and labels value tests/support, not format usage permission |

No commission percentage, artist payout schedule, subscription price, market
territory or certification fee is selected. Avoid implying business forecasts
are validated; first measure user interest and unit economics, including
payment fees, storage, downloads and support.

## Program sequencing and implementation boundaries

### Slice 0: prove the open ownership workflow

- Import locally acquired album files/folders/archives and preserve sound
  recordings when compatible.
- Inspect actual codec, sample rate, bit depth, channel layout and tracks.
- Build, verify, play and burn a recoverable OMD release without an account.
- Prototype multichannel presentation packaging and renderer negotiation under
  the revised format proposal; do not promise codecs that are not implemented.

**Acceptance:** A purchased FLAC album can become a verified, offline-playable
OMD package and, with available hardware, a validated disc. Unsupported
multichannel sources produce explicit errors rather than false compatibility.

### Slice 1: modular discovery and acquisition

- Publish `MusicDiscoveryConnector`, `MusicStoreConnector` and
  `MusicAcquisitionConnector` contracts with scoped capabilities.
- Implement one lawful catalog/library import and one store deep-link provider.
- Match specific editions/recordings, not just artist/title.
- Support manual checkout and user-authorized local download import without
  needing a store's private purchase API.
- Keep publisher-approved native mixes intact and package what is actually
  downloaded; no streaming download extraction.

**Acceptance:** User can go from a favorite album to a grounded purchasable
edition link, download through the seller, import, verify, play and burn. The
path works with the first-party marketplace entirely absent.

### Slice 2: official OMD marketplace pilot

- Define publisher eligibility, permitted audio rights, release metadata,
  file security, revocation/dispute handling, return/refund policy and
  artist/label terms.
- Build separate private commerce backend for catalog, checkout, order ledger,
  entitlements and delivery. Choose payment processor and hosting based on
  applicable regulations and rights obligations.
- Publish the client-facing purchase/download connector contract needed
  by third-party OMD software. Store outputs ordinary verified OMD packages.
- Pilot with a small group of rights-cleared artists and high-quality
  stereo/multichannel releases, with explicit decoder expectations.

**Acceptance:** Artist can upload and publish an authorized OMD album,
customer can purchase, re-download, verify, play without a subsequent account
check, and burn on supported media. Verify that first-party website downtime
does not make downloaded releases unusable.

### Slice 3: premium devices and services

- Optional sync/backup/collection management with transparent export.
- Hardware and branded media where customer adoption justifies investment.
- Open conformance test plan for competing devices; published brand
  certification rules if a program becomes necessary.

### Related planned design

- [Core strategy](./strategy.md)
- [Format direction](./format-direction.md)
- [Roadmap](./ROADMAP.md)
- [Draft audio presentation design PR #2](https://github.com/ashergarland/open-media-disc/pull/2)
- [Draft acquisition ecosystem strategy PR #3](https://github.com/ashergarland/open-media-disc/pull/3)

The currently open design branches must eventually be reconciled; do not treat
unmerged proposals as shipped requirements.

## Technical boundaries

Suggested future repository layout, not directories that exist now:

```text
open-media-disc/                  # Public
  spec/                           # Release format and compatibility
  packages/core/                  # Packaging and validation SDK
  packages/cli/                   # Existing CLI
  packages/studio/                # Existing GUI authoring/player
  packages/connectors/            # Proposed public interfaces
  connectors/                     # Proposed reference provider adapters

omd-commerce/                     # Separate private repository (future)
  storefront/                     # Sales user interface / API
  catalog/                        # Commercial catalog and licensed content
  orders-and-fulfillment/         # Purchases, entitlements, download delivery
  artist-operations/              # Rights, reporting, payouts
```

Use non-privileged connector contracts and least-privilege access to customer
preferences and tokens. A purchase receipt, service token or artist agreement
is not part of a release manifest. A customer may use local OMD files without
opening an account. No proprietary extension may become the *only* way to read
a normal package.

## Open business and legal decisions

These must be decided and recorded before implementation or public commercial
claims. None is a requirement on the current v0.1 on-disc format.

1. Whether and when to form a business entity, and ownership/assignment of
   project trademarks, new commercial assets and artist contracts.
2. Open-source contributor policy (DCO versus CLA, if any), component-level
   licenses, codec dependencies and third-party patent/format risk.
3. Explicit spec, schema and fixture licensing plus independent
   interoperability/conformance and versioning governance.
4. OMD name/logo trademark search, registration (if appropriate), brand-use
   guidelines, and independent compatible-products policy.
5. Artist and label rights verification, geographic rights, mechanical and
   publishing obligations, permitted artwork/lyrics, reporting and takedowns.
6. Checkout processor, chargebacks, refunds, tax/VAT/sales tax obligations,
   payout cadence and artist platform commission; no percentages assumed.
7. Download hosting/storage economics, egress for high-resolution immersive
   masters, repeat downloads and privacy/security/retention expectations.
8. Whether official client storefront code is public or private; desktop
   reference Player and Studio remain open by policy.
9. Hardware margin, supply chain and certification requirements only when the
   device roadmap is activated.

### Defensibility and failure modes

**Defensible differentiation:** trust, a strong rights-cleared catalog,
exclusive or desirable versions, artist relationships, actual availability
of purchased high-resolution/multichannel audio, user experience,
distribution and premium hardware.

**Not defensibility:** artificially breaking third-party players,
mandatory online activation, proprietary metadata required for reading a
valid OMD release, inaccessible album archives, or hidden connector privileges.

**Risk:** MIT means competitors can legally commercialize the open core under
its conditions. That is a deliberate adoption tradeoff. We can create
strong commercial differentiation without restricting ordinary playback.

## Decision review gates

Before a first-party paid service launches, require:

- A documented OMD format/extension compatibility guarantee.
- A reproducible, account-free import/play/burn conformance demonstration.
- A working authorized acquisition/download and verified package import path.
- Rights and contract review by qualified counsel, including service
  jurisdiction, user/artist terms and trademark plans.
- Cost model for each purchase and hosted download, and a pilot with actual
  rights-cleared artist/customer participants.

**Status discipline:** This document does not schedule a development milestone,
change the MIT license, alter the normative spec, create an OMD store, or
authorize selling any third-party copyrighted music.
