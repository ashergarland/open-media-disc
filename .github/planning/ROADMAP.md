# OMD roadmap

The comprehensive plan: what Open Media Disc is trying to achieve, and the
ordered milestones that get it there. This is the **agent-facing planning
roadmap**. The public, user-facing summary is
[`../../documentation/roadmap.md`](../../documentation/roadmap.md) and it must be
kept consistent with this file whenever a milestone changes state.

Live progress is tracked in [`STATUS.md`](./STATUS.md). Unscheduled ideas live in
[`ideas/`](./ideas/README.md). Parked hardware work lives in
[`hardware-milestones.md`](./hardware-milestones.md).

> Dates are intentionally omitted. Milestones ship when the previous one is
> solid.

## The objective

**Make OMD a format people actually use, by making it the easiest physical music
format to build on.**

A format does not win because its flagship app is good. It wins because it is
everywhere: in other people's tools, in other languages, in libraries, in
scripts, in file managers, in players nobody on this project wrote. The strategy
is therefore **ecosystem breadth over feature depth**.

### What we are optimizing for

| Objective | Meaning | How we would know |
| --- | --- | --- |
| **O1. Trivial to implement** | A competent developer can write an OMD reader in an afternoon, in any language, from the spec alone. | A conformance suite exists, a second-language SDK passes it, and an outside implementation appears. |
| **O2. Trivial to adopt** | Getting an album onto a disc, or a disc into a library, takes minutes with no OMD-specific knowledge. | A first-time user completes create, burn, play without reading docs. |
| **O3. Everywhere the music already is** | OMD interoperates with the tools people already use for their libraries rather than demanding they move. | Import and export paths exist for the common library and metadata sources. |
| **O4. Nobody is locked out** | The format and the tools work regardless of platform, ability, or budget. | Cross-platform parity, and the apps meet a stated accessibility bar. |
| **O5. Trustworthy over time** | A disc burned today reads in ten years, on hardware nobody has built yet. | Format stability guarantees, versioning discipline, and recoverability with ordinary tools. |
| **O6. Worth showing people** | The physical object and the software around it feel like a real product, not a hobby project. | Labels, artwork, themes, and the app read as premium. |

### Commitments that will not change lightly

- **Spec-first.** Interoperability decisions live in [`../../spec/`](../../spec)
  before they live in code.
- **Recoverable media.** Files stay browsable and restorable with ordinary tools.
  No proprietary container, no DRM.
- **Format and software versions move independently.** A tool release never
  silently changes the disc format.
- **One codec per package, described honestly.** "Lossless" describes the
  container, not the audio's history.
- **The cartridge is the format; the DVD-RW is the storage layer.**

## Delivered milestones

| Milestone | Goal | Version |
| --- | --- | --- |
| **Core v0.1** | Stable package format: create, validate, inspect. | `v0.1.0` |
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

## Parked

- **Hardware.** The whole hardware program (writer dock, Pi player, deck,
  portable, cartridge-native) is preserved in
  [`hardware-milestones.md`](./hardware-milestones.md). One prompt is written and
  ready to run whenever the user has a disc and bench time:
  [`hardware-01-studio-burn-and-play-acceptance`](../prompts/hardware/hardware-01-studio-burn-and-play-acceptance.prompt.md).

## Out of scope, still

Cloud accounts, DRM, a marketplace, and streaming-service playback integration.
Reading metadata **from** a service to enrich a package is fine; playing music
**from** a service is not what OMD is.

Only distribute music you own the rights to.
