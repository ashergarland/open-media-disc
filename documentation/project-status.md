# Project status

A high-level snapshot of what is built today and what is left, measured against
the goals in the [Roadmap](./roadmap.md). For the vision behind the project, see
[What is OMD?](./what-is-omd.md).

> Scope note: this page tracks the state of the **software** milestone. Media and
> hardware milestones are described in the [Roadmap](./roadmap.md).

## In one line

Open Media Disc (OMD) is an open-source physical music format. The current
milestone, **OMD Core v0.1**, makes the format real as pure software: it turns a
folder of owned FLAC files into a verified, self-describing album package. No
burning, hardware, or GUI is part of this milestone.

## What is implemented (OMD Core v0.1)

The repository delivers a working pnpm and TypeScript monorepo in four layers:

- **The normative format contract** in [`spec/`](../spec): `OMD_FORMAT_SPEC.md`,
  `OMD_DISC_LAYOUT.md`, `OMD_VALIDATION_RULES.md`, and `OMD_MANIFEST_SCHEMA.json`.
  The spec is the source of truth the code and docs follow. Format id is
  `OMD-FLAC-DATA`, version `0.1.0`.
- **The core SDK** `@open-album-cartridge/core` ([`packages/core`](../packages/core))
  covering the full package lifecycle:
  - `createPackage`, `validatePackage`, `inspectPackage`.
  - Manifest create, parse, and validate (Zod plus JSON Schema), SHA-256
    checksums, a dependency-free FLAC metadata reader, filename normalization,
    and 8cm DVD-RW disc-size estimation (about a 1.4 GB budget).
- **The `omd` CLI** `@open-album-cartridge/cli` ([`packages/cli`](../packages/cli))
  with commands `create`, `validate`, `inspect`, `checksum`, and `play` (play is
  a no-audio preview stub), plus `--help` and `--version` and a 0/1/2 exit-code
  convention.
- **Supporting assets:** synthetic FLAC example fixtures generated via
  `pnpm gen:examples`, a passing Vitest suite, and clean lint. The public docs
  live in [`documentation/`](./README.md).

End to end, you can already build a package from an album folder, validate its
structure, tracks, checksums, and capacity, inspect it, and preview track order.

## What is left (per the roadmap)

Everything past v0.1 is still to come. The ladder builds outward only after the
format is proven.

| Milestone | Goal | Status |
| --- | --- | --- |
| Write and Play (v0.2) | Burn a package to 8cm DVD-RW and play it back from the CLI | In progress |
| OMD Studio (alpha) | Desktop app wrapping the core: package, label, burn | Planned |
| Multi-language SDKs | Shared conformance fixtures across TS (later Rust) | Planned |
| Writer Dock | Device: erase, burn, verify, eject 8cm DVD-RW | Planned |
| Pi Player | Raspberry Pi device that plays bare OMD discs | Planned |
| OMD Deck | Component-style home-audio player | Research |
| Portable player | Battery, MiniDisc-style handheld | Research |
| Cartridge-native | 8cm DVD-RW inside a serviceable cartridge shell | Long-term R&D |

Explicitly **out of scope for v0.1** and deferred to those milestones: optical
burning, UDF/ISO image creation, Raspberry Pi device services, hardware control,
cartridge mechanics, GUI/desktop/mobile apps, cloud accounts, DRM,
DVD-Audio/Blu-ray authoring, marketplace features, and streaming integration.

## The gap in plain terms

- **Done:** the software format and its tooling (spec, SDK, CLI, docs, tests).
  The "album folder in, verified package out" loop works today.
- **In progress (v0.2):** the host-side media loop: building a burn-ready disc
  image, writing a package to 8cm DVD-RW, and playing it back from the CLI.
- **Not yet started:** dedicated hardware (a writer dock, a Pi player, the
  cartridge shell), the desktop Studio app, and additional-language SDKs.

The immediate next step is the **v0.2 Write and Play** milestone: build a
burn-ready UDF disc image, write a package to physical 8cm DVD-RW through a
cross-platform `BurnBackend` (Windows IMAPI2 first), and add real host playback to
`omd play`. See the [Roadmap](./roadmap.md#next-milestone-v02-write-and-play) for
the goal and exit criteria.

## Keep this page current

Update this page whenever a milestone's status changes or a new public surface
lands, in the same change as the code. It should always reflect the real state of
the repository.
