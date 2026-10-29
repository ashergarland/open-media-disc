# OMD roadmap

The comprehensive plan: what Open Media Disc is trying to achieve, and the
ordered milestones that get it there. The product thesis and adoption strategy
are defined in [`strategy.md`](./strategy.md). This is the **agent-facing
planning roadmap**. The public, user-facing summary is
[`../../documentation/roadmap.md`](../../documentation/roadmap.md) and it must be
kept consistent with this file whenever a milestone changes state.

Live progress is tracked in [`STATUS.md`](./STATUS.md). Unscheduled ideas live in
[`ideas/`](./ideas/README.md). Parked hardware work lives in
[`hardware-milestones.md`](./hardware-milestones.md).

> Dates are intentionally omitted. Milestones ship when the previous one is
> solid.

## The objective

**Make the digital-to-physical album experience so good that collectors and
independent artists voluntarily adopt OMD before dedicated hardware exists.**

OMD begins with commodity media and open software, then earns demand for the
cartridge and dedicated hardware experience. A format does not win because its
flagship app is good. It wins because people find it useful and because it is
everywhere: in other people's tools, in other languages, in libraries, in
scripts, in file managers, and in players nobody on this project wrote. The
strategy is therefore **grassroots utility and ecosystem breadth before
dedicated hardware**.

### What we are optimizing for

| Objective | Meaning | How we would know |
| --- | --- | --- |
| **O1. Trivial to implement** | A competent developer can write an OMD reader in an afternoon, in any language, from the spec alone. | A conformance suite exists, a second-language SDK passes it, and an outside implementation appears. |
| **O2. Trivial to adopt** | Getting an album onto a disc, or a disc into a library, takes minutes with no OMD-specific knowledge. | A first-time user completes create, burn, play without reading docs. |
| **O3. Everywhere the music already is** | OMD interoperates with the tools people already use for their libraries rather than demanding they move. | Import and export paths exist for the common library and metadata sources. |
| **O4. Nobody is locked out** | The format and the tools work regardless of platform, ability, or budget. | Cross-platform parity, and the apps meet a stated accessibility bar. |
| **O5. Trustworthy over time** | A package created under the first stable format reads in ten years, on hardware nobody has built yet. | A deliberate stable release, versioning discipline, and recoverability with ordinary tools. |
| **O6. Worth showing people** | The physical object and the software around it feel like a real product, not a hobby project. | Labels, artwork, themes, and the app read as premium. |

### Commitments that will not change lightly

- **Spec-first.** Interoperability decisions live in [`../../spec/`](../../spec)
  before they live in code.
- **Recoverable media.** Files stay browsable and restorable with ordinary tools.
  No proprietary container, no DRM.
- **Format and software versions move independently.** A tool release never
  silently changes the disc format.
- **Pre-stable design may break.** OMD is private and has not shipped a stable
  format. Draft compatibility is not preserved at the expense of the right
  long-term design. Compatibility guarantees begin with the first stable format.
- **Honest presentation facts, with a revised format direction.** The current
  v0.1 draft uses one codec per package. The next format is being revised to
  allow multiple publisher-selected mixes with per-presentation codec/layout
  facts (see [draft PR #2](https://github.com/ashergarland/open-media-disc/pull/2)).
  User-facing surfaces state measured codec and technical properties without
  guessing the original source or its mastering history.
- **The cartridge is the flagship physical experience, not a gate.** The open
  release format must remain useful on commodity media and implementable without
  official hardware.

## Delivered milestones

| Milestone | Goal | Version |
| --- | --- | --- |
| **Core v0.1** | Initial draft package format: create, validate, inspect. | `v0.1.0` |
| **Write and Play v0.2** | Burn a package to 8cm DVD-RW and play it back from the CLI. | `v0.2.0` |
| **OMD Studio (alpha)** | Desktop and touch app wrapping the core: package, label, burn, play, rip. | `studio-v0.2.0` |
| **Studio touch-first redesign** | Token-based theming, hub-and-spoke navigation, Pi and kiosk tuning. | `studio-v0.2.0` |

Details of each are in [`STATUS.md`](./STATUS.md) under Completed milestones, and
the delivered prompt chains are in
[`../prompts/archive/`](../prompts/archive/studio-redesign/README.md).

## Planned milestones

**Selection pending.** The project is in an ecosystem planning phase. Candidate
work is catalogued in [`ideas/`](./ideas/README.md); nothing is committed until
the user selects ideas and they are written into this section as milestones.

When a milestone is added here it must carry all of the following, because
`/milestone-plan` generates its prompt chain from exactly these fields:

| Field | Purpose |
| --- | --- |
| **ID** | Short, stable, kebab-case. Becomes the prompt folder name (`.github/prompts/<id>/`). |
| **Goal** | One paragraph. What is true when this is done that is not true now. |
| **Objectives served** | Which of O1-O6 above, so priority is arguable rather than vibes. |
| **Ideas included** | The idea IDs from [`ideas/`](./ideas/README.md) this milestone delivers. |
| **In scope** | Bulleted, concrete. |
| **Non-goals** | Bulleted, concrete. This is what stops scope creep mid-chain. |
| **Exit criteria** | Testable statements. Always includes build, test, lint green and docs updated. |
| **Format impact** | Whether `omdVersion` changes. Default is no. |
| **Depends on** | Other milestone IDs that must land first. |

## Sequencing priorities from the acquisition strategy

The product order below is the user's preferred sequence and guides the next
milestone-selection discussion. It is **not** a declaration that code ships
today or that the listed integrations have approved APIs.

| Priority | Product slice | First independently demonstrable result |
| --- | --- | --- |
| 1 | Purchased downloads into OMD | Import a Bandcamp or Qobuz FLAC album folder/ZIP, validate and play a portable OMD package, then burn and verify with available hardware |
| 1 | High-quality audio and multiple presentations | Verify high-res core playback, investigate stereo + 5.1 files in one future package, negotiate speaker/headphone outputs and show actual audio facts |
| 2 | Apple Music library-to-purchase discovery | Opt-in read of library/favorites or user-exported playlist, album/edition matching, and trustworthy store purchase links with honest format labels |
| 2 | Store-assisted purchase handoff | User completes transaction in retailer; purchased downloaded files flow through the same OMD importer |
| 3 | Native OMD artist store | Artist publishes OMD masters, customers purchase and retain verifiable files, Player downloads, plays and optionally burns |

Prefer a thin vertical slice with real legally acquired files over building
store authentication, checkout scraping, and speculative downloader APIs first.
Actual music service streaming/download entitlements are not portable OMD media.
The initial acquisition integrations should target read-only metadata and
manual authorized purchase/download flows until partners expose supported
interfaces.

The following ideas are candidate ingredients for upcoming milestone selection:
INT-5, INT-14, INT-15, INT-16, APP-12, and the draft format proposal on PR #2.
When selected, each milestone still needs the full scope, non-goals,
dependencies, conformance gates, documentation impact, and tests specified
above.

## Parked

- **Hardware.** The whole hardware program (writer dock, Pi player, deck,
  portable, cartridge-native) is preserved in
  [`hardware-milestones.md`](./hardware-milestones.md). One prompt is written and
  ready to run whenever the user has a disc and bench time:
  [`hardware-01-studio-burn-and-play-acceptance`](../prompts/hardware/hardware-01-studio-burn-and-play-acceptance.prompt.md).

## Scope boundaries

The near-term open OMD format and offline Player do not require cloud accounts,
DRM, or a marketplace. Reading authorized music-library metadata and linking
to existing retailers is in scope for planned acquisition features.

A first-party artist-publishing and OMD purchase website is a **long-term
strategic goal**, but payments, cloud account services, catalog hosting and
remote delivery are independent of the file-format core. Streaming music from
third-party subscription services and bypassing retailer access restrictions
are not acquisition pathways.

Only distribute music for which the publisher has the necessary rights.
