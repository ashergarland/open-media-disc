# Open Media Disc — Documentation

Welcome to the official documentation for **Open Media Disc (OMD)** — an
open-source physical music format. This is the public landing page for users and
developers. If you are new here, start with **[What is OMD?](./what-is-omd.md)**
and then **[Getting Started](./getting-started.md)**.

> **The cartridge is the format; the DVD-RW is the storage layer.**
> OMD Core v0.1 is pure software: **album folder in → verified OMD package out →
> validate / inspect / play locally.** No burning, no hardware, no GUI yet.

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
| Get quick answers | [FAQ](./faq.md) |
| Look up a term | [Glossary](./glossary.md) |
| Contribute | [Contributing](./contributing.md) |

## Documentation map

```text
documentation/
  README.md            You are here — public landing + index
  what-is-omd.md       Vision, motivation, and design principles
  project-status.md    What is built today and what is left
  installation.md      Prerequisites, install, build, verify
  getting-started.md   First package walkthrough (create → validate → inspect)
  package-format.md    Anatomy of an OMD package (human-friendly)
  cli-reference.md     Every `omd` command and option
  sdk-reference.md     @open-album-cartridge/core API reference
  validation.md        Error/warning codes and how to fix them
  roadmap.md           Milestones from software to cartridge hardware
  faq.md               Common questions
  glossary.md          Terminology
  contributing.md      How to work on OMD and keep docs in sync
```

## The formal specification

This documentation is the **friendly, task-oriented** entry point. The
**normative** contract that every OMD implementation must follow lives in the
[`spec/`](../spec) folder:

- [OMD_FORMAT_SPEC.md](../spec/OMD_FORMAT_SPEC.md) — format identity and rules
- [OMD_DISC_LAYOUT.md](../spec/OMD_DISC_LAYOUT.md) — required/optional paths
- [OMD_VALIDATION_RULES.md](../spec/OMD_VALIDATION_RULES.md) — validation codes
- [OMD_MANIFEST_SCHEMA.json](../spec/OMD_MANIFEST_SCHEMA.json) — JSON Schema

When documentation and the spec disagree, **the spec wins** — please open an
issue so we can fix the docs.

## Packages

| Package | What it is |
| --- | --- |
| [`@open-album-cartridge/core`](../packages/core) | Platform-independent SDK: create, validate, inspect packages. |
| [`@open-album-cartridge/cli`](../packages/cli) | The `omd` command-line tool. |

## Current status

- **Format:** `OMD-FLAC-DATA` v0.1.0
- **Milestone:** OMD Core v0.1 — create and validate packages, no hardware.
- **License:** [MIT](../LICENSE)

---

_Only distribute music you own the rights to. OMD is a format for personal,
owned-library album objects._
