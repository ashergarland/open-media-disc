# Product context for AI agents

This file is **agent-facing background**, not user documentation. It captures the
"why" behind Open Media Disc so agents make decisions that match the project's
intent. It is intentionally kept out of the README, which should stay short and
developer-focused. The public-facing version of this vision lives in
[`documentation/what-is-omd.md`](../../documentation/what-is-omd.md); keep the two
aligned when the vision changes.

## The core idea

A recorded blank should feel like a legitimate album object, not a homemade
substitute. OMD makes the digital-to-physical album experience compelling for
collectors and independent artists, using open software and commodity media
today while working toward a protected cartridge experience inspired by
MiniDisc and UMD.

The strategic source of truth is
[`../planning/strategy.md`](../planning/strategy.md).

## The mental model that guides decisions

**The cartridge is the flagship physical experience, not a gate around the open
format.** Reason about the project in layers, and prove demand before investing
in dedicated hardware:

1. The **release format** (manifest + owned media + checksums), currently realized
   as the v0.1 album package.
2. The **commodity-media ecosystem**: create, present, write, verify, recover,
   catalog, and play releases with accessible hardware.
3. The **cartridge ecosystem**: the protected physical object plus dedicated
   drives, players, writers, and certified hardware.

Everything downstream (Raspberry Pi players, a writer dock, a cartridge-native
drive, multi-language SDKs, OMD Studio) depends on the format being stable,
inspectable, and verifiable first. It also depends on people wanting to create
and collect OMD releases before dedicated hardware exists. When unsure, protect
recoverability and favor the digital-to-physical album workflow.

## Why v0.1 is a FLAC data package (and only that)

- A solid, verifiable album package unblocks every future tool without drift.
- FLAC-in-a-data-package is simple to author, validate, and parse, including on
  future embedded players.
- Plain files (FLAC, JSON, SHA-256) stay recoverable with ordinary tools and are
  never locked inside a proprietary silo.
- DVD-Audio is optimized for authored audiophile releases and niche players, so
  it is not the native format. It may become an optional export mode later.

## Scope boundaries for v0.1 (assume these unless told otherwise)

In scope: read an owned FLAC album folder, normalize track order/metadata/
filenames, emit `OMD-MANIFEST.json` + cover art + `CHECKSUMS.sha256`, and
validate structure, tracks, checksums, and 8cm DVD-RW capacity (~1.4 GB).

Out of scope: optical burning, UDF/ISO image creation, Raspberry Pi device
services, hardware control, cartridge mechanics, GUI/desktop/mobile apps, cloud
accounts, DRM, DVD-Audio/Blu-ray authoring, marketplace features, and streaming
integration. v0.1 makes the format real, nothing more.

## Guiding principles (apply when making design calls)

- **Spec first, implementation second.** Interoperability decisions live in
  `spec/` before code.
- **Digital-to-physical first.** Optimize for collectors making owned digital
  albums physical and independent artists producing credible short runs.
- **The disc stays recoverable.** The format must be debuggable outside its own
  ecosystem with ordinary tools.
- **Album-first, not folder-first.** A player reads the manifest and shows an
  album, never a file browser.
- **Deterministic and verifiable.** Same input produces the same output; every
  package carries checksums.
- **Open before official.** The format remains implementable without official
  hardware. Third-party players and writers grow the ecosystem.
- **Do not block on the hard part.** Cartridge mechanics come only after the
  software ecosystem proves demand.

## OMD Studio (alpha) decisions (locked)

These are locked planning decisions for the OMD Studio (alpha) milestone. See
[`documentation/omd-studio.md`](../../documentation/omd-studio.md) for the full
design note.

- **Themeable in-app player.** Retro, Winamp-inspired looks come from VS
  Code-style token themes: a theme is data (a JSON map of named tokens plus local
  assets), injected as CSS variables. Themes never ship CSS or JS and never
  control layout. Layout and interaction stay consistent across every theme.
- **Player scope.** It is an album/disc player, not a music library manager. FLAC
  plays natively in Chromium, so no custom decoder is needed for alpha; the
  external players (`mpv`, `ffplay`) stay a CLI fallback.
- **`omd rip`.** Verified read-back of a mounted OMD disc to disk (a re-burnable
  package or a friendly album folder), checked against the manifest checksums. It
  is a shared core function that Studio wraps, and it does not change the format
  (`omdVersion` stays `0.1.0`).
- **Share for the Pi player.** Player and theming live in a shared UI package so
  the future Raspberry Pi player reuses the same components and theming contract.
  Studio owns the desktop shell and the burn and label workflows.
- **Navigation and layout.** OMD Studio uses a sidebar shell: a slim left icon
  nav (Create Disc, Player, Catalog, Themes, Settings), a main content area, and a
  persistent Now Playing bar. The default theme is Y2K / Frutiger Aero (glossy
  aqua). For touch-first hardware (Raspberry Pi touchscreens and appliance-style
  OMD devices) a dashboard tile launcher layout is preferred over the sidebar, and
  it should shape the future Pi player UI.

## Ethics

OMD is for music the user owns. Never help use OMD to distribute music the user
does not own.
