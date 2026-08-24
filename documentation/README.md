# Open Media Disc: Documentation

Welcome to the official documentation for **Open Media Disc (OMD)**, an
open-source physical music format. This is the public landing page for users and
developers. If you are new here, start with **[What is OMD?](./what-is-omd.md)**
and then **[Getting Started](./getting-started.md)**.

> **The cartridge is the format; the DVD-RW is the storage layer.**
> The v0.1 format is pure software: **album folder in, verified OMD package
> out.** v0.2 adds imaging, burning to disc (Windows), and playback. OMD Studio,
> the desktop and touch app, has shipped.

---

## Start here

| I want to… | Read |
| --- | --- |
| Understand what OMD is and why it exists | [What is OMD?](./what-is-omd.md) |
| See what is built and what is left | [Project Status](./project-status.md) |
| Install the tools | [Installation](./installation.md) |
| Make my first package | [Getting Started](./getting-started.md) |
| Learn what's inside a package | [Package Format](./package-format.md) |
| Look up a CLI command | [CLI Reference](./cli-reference.md) |
| Call the library from code | [SDK Reference](./sdk-reference.md) |
| Understand validation results | [Validation Guide](./validation.md) |
| See where the project is going | [Roadmap](./roadmap.md) |
| Read about the OMD Studio app | [OMD Studio](./omd-studio.md) |
| Get quick answers | [FAQ](./faq.md) |
| Look up a term | [Glossary](./glossary.md) |
| Contribute | [Contributing](./contributing.md) |

## Documentation map

```text
documentation/
  README.md            You are here (public landing + index)
  what-is-omd.md       Vision, motivation, and design principles
  project-status.md    What is built today and what is left
  installation.md      Prerequisites, install, build, verify
  getting-started.md   First package walkthrough (create → validate → inspect)
  package-format.md    Anatomy of an OMD package (human-friendly)
  cli-reference.md     Every `omd` command and option
  sdk-reference.md     @open-media-disc/core API reference
  validation.md        Error/warning codes and how to fix them
  roadmap.md           Milestones from software to cartridge hardware
  omd-studio.md        OMD Studio: the desktop/touch app, theming, and ripping
  redesign-plan.md     Working brief for the Studio touch-first redesign
  faq.md               Common questions
  glossary.md          Terminology
  contributing.md      How to work on OMD and keep docs in sync
```

## The formal specification

This documentation is the **friendly, task-oriented** entry point. The
**normative** contract that every OMD implementation must follow lives in the
[`spec/`](../spec) folder:

- [OMD_FORMAT_SPEC.md](../spec/OMD_FORMAT_SPEC.md): format identity and rules
- [OMD_DISC_LAYOUT.md](../spec/OMD_DISC_LAYOUT.md): required/optional paths
- [OMD_VALIDATION_RULES.md](../spec/OMD_VALIDATION_RULES.md): validation codes
- [OMD_MANIFEST_SCHEMA.json](../spec/OMD_MANIFEST_SCHEMA.json): JSON Schema

When documentation and the spec disagree, **the spec wins**. Please open an
issue so we can fix the docs.

## Packages

| Package | What it is |
| --- | --- |
| [`@open-media-disc/core`](../packages/core) | Platform-independent SDK: create, validate, inspect, image, burn, rip. |
| [`@open-media-disc/cli`](../packages/cli) | The `omd` command-line tool. |
| [`@open-media-disc/label`](../packages/label) | Printable label sheets. |
| [`@open-media-disc/ui`](../packages/ui) | Shared player state model. |
| [`@open-media-disc/studio`](../packages/studio) | OMD Studio, the Electron desktop and touch app. |

## Current status

- **Current format:** private draft `OMD-FLAC-DATA` v0.1.0, with one package
  codec chosen from FLAC, MP3, AAC, Vorbis, Opus, or WAV.
- **Planned first stable format:** FLAC and MP3 package codecs, with additional
  source formats normalized during import. This is design intent, not current
  behavior. See [Package Format](./package-format.md#codec-status).
- **Milestone:** Core v0.1, v0.2 (Write and Play), and OMD Studio (alpha) are
  done. The next set of software milestones is being planned.
- **License:** [MIT](../LICENSE)

---

_Only distribute music you own the rights to. OMD is a format for personal,
owned-library album objects._
