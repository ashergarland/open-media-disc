# OMD status

The **live tracker** for prompt-driven development. Every milestone step prompt
reads this file first and updates it last. If you are starting a fresh chat, this
is the first thing to read after
[`../copilot-instructions.md`](../copilot-instructions.md).

Do not delete history from this file. Completed milestones move down into the
completed table; they do not disappear.

Last updated: 2026-08-08.

## Current milestone

**None. Between milestones.**

The OMD Studio touch-first redesign shipped as `studio-v0.2.0` and its prompt
chain is archived in
[`../prompts/archive/studio-redesign/`](../prompts/archive/studio-redesign/README.md).
Hardware work is parked in
[`hardware-milestones.md`](./hardware-milestones.md).

The project is in an **ecosystem and format planning phase**. The product
strategy is captured in [`strategy.md`](./strategy.md), and settled and open
format decisions are tracked in
[`format-direction.md`](./format-direction.md). The next task is to complete the
format direction before selecting and grouping software milestones in
[`ROADMAP.md`](./ROADMAP.md).

| Field | Value |
| --- | --- |
| Milestone | (none selected) |
| Prompt chain | (not yet generated) |
| Next step | Define codec-neutral gapless playback in [`format-direction.md`](./format-direction.md) |
| Blocked on | Format direction decisions needed before committing software milestones |

## Repository state

| Field | Value |
| --- | --- |
| Branch | `main`, ahead of `origin/main`. **Never push without asking.** |
| Last release | `@open-media-disc/studio` 0.2.0, tag `studio-v0.2.0` (annotated, local only) |
| Format version | Private draft `omdVersion` 0.1.0, format id `OMD-FLAC-DATA`; no compatibility guarantee until the first stable format |
| Package versions | root, `core`, `cli`, `label`, `studio` at 0.2.0; `ui` at 0.1.0 |
| Gates | `pnpm build`, `pnpm test` (157), `pnpm lint` green as of `studio-v0.2.0` |

## Completed milestones

| Milestone | Delivered | Version / tag | Where it lives now |
| --- | --- | --- | --- |
| **Core v0.1** | The package format and its tooling: spec, `@open-media-disc/core`, the `omd` CLI (`create`, `validate`, `inspect`, `checksum`), fixtures, docs. | `v0.1.0` | [`spec/`](../../spec), [`packages/core`](../../packages/core) |
| **Write and Play v0.2** | The host media loop: UDF image build, burn to 8cm DVD-RW with verify (Windows/IMAPI2), playback via mpv/ffplay, `omd image` / `omd burn` / `omd play`. | `v0.2.0` | [`packages/core`](../../packages/core), [`packages/cli`](../../packages/cli) |
| **OMD Studio (alpha)** | Electron desktop and touch app wrapping the core: import, package, label, burn, verify, play, rip. Plus `@open-media-disc/label` and `omd label`. | `studio-v0.2.0` | [`packages/studio`](../../packages/studio) |
| **OMD Studio touch-first redesign** | The app rebuilt on the `--omd-*` token contract, hub-and-spoke navigation, three token-map themes, Pi and kiosk tuning, docs pass, release. 10-step prompt chain, 9 steps delivered. | `studio-v0.2.0` | [archive](../prompts/archive/studio-redesign/README.md) |

## Active blockers

| ID | Blocker | Impact | Owner |
| --- | --- | --- | --- |
| B-1 | Hardware acceptance of the redesigned Studio has never run on a real disc. | The burn, verify, eject, reinsert, play, rip loop is unproven since the redesign. Any burn-path regression is currently invisible. | User (needs a writer plus a DVD-RW). Prompt is ready: [`hardware-01-studio-burn-and-play-acceptance`](../prompts/hardware/hardware-01-studio-burn-and-play-acceptance.prompt.md) |
| B-2 | Burning is Windows-only (IMAPI2). | Blocks Linux and macOS users entirely, and blocks every hardware device milestone. | Unassigned |
| B-3 | `main` is ahead of `origin/main` and `studio-v0.2.0` is unpushed. | The remote does not reflect the delivered work. | User decision |

## Decisions made

Newest first. Record any choice a future chat could get wrong.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-08-09 | The stable MP3 profile is MPEG-1 Layer III in `.mp3`, at 32/44.1/48 kHz, mono/stereo/joint stereo, with legal 32-320 kbps CBR or legal VBR frames. Normalization uses 44.1 kHz stereo at 320 kbps CBR or mono at 160 kbps CBR. | This preserves common purchased MP3 albums while bounding player complexity and gives mono and stereo normalization the same nominal bits per channel. |
| 2026-08-09 | The stable FLAC profile is native RFC 9639 streamable-subset FLAC, mono or stereo, 16 or 24 bit, at 44.1/48/88.2/96/176.4/192 kHz. Every OMD Player supports the complete profile through 24-bit/192 kHz. | This preserves common purchased high-resolution releases and artist masters. The format accepts higher hardware cost rather than permanently requiring resampling to accommodate the cheapest embedded decoder chips. |
| 2026-08-09 | Automatic normalization keeps the previously selected two-path policy: FLAC/WAV/AIFF/ALAC-family input routes to FLAC; AAC/Vorbis/Opus or mixed input containing compressed sources routes to MPEG-1 Layer III at 44.1 kHz, stereo, 320 kbps CBR. Uniform compatible FLAC and MP3 are preserved. | This balances package size, predictable playback, and simple user experience without bloating compressed sources into FLAC or exposing conversion choices. Bitrate remains a packaged-file fact, not a quality score. |
| 2026-08-08 | The first stable package codecs are FLAC and MP3. OMD Studio automatically preserves uniform core-codec releases, normalizes WAV/AIFF/ALAC-family input to FLAC, and normalizes AAC/Vorbis/Opus or mixed-codec input to one standard MP3 profile. The normal workflow presents no codec choice. | One automatic ingestion policy gives common digital albums and mixtapes a good path into a simple one-codec physical format without turning OMD Studio into a general conversion application. |
| 2026-08-08 | OMD user-facing surfaces never label audio `lossless` or `lossy` and never claim its history. They state only the codec and applicable measured facts such as sample rate, channels, bit depth, bitrate, and bitrate mode. No source-codec or conversion-history metadata is stored. | Audio history cannot be established reliably, and partial provenance would imply guarantees OMD cannot make. |
| 2026-08-08 | **Superseded later on 2026-08-08.** The first stable package codec list was FLAC, MP3, and narrowly specified AAC/M4A, with user-directed import conversion. | AAC was removed from the universal player contract, and per-import choices were replaced by automatic whole-release normalization. |
| 2026-08-08 | **Partially superseded later on 2026-08-08.** Players and importers support compatible CBR and VBR MP3/AAC, while producers need not offer VBR encoding. | VBR preservation remains for MP3. AAC is now an import normalized to MP3 rather than a stable package codec. |
| 2026-08-07 | Conformance is role-based: Reader, Validator, Player, Producer, and Writer. Extensions are independently declared capabilities; there is no permanent Core versus Full tier. | Role claims describe what a product actually does, while extension capabilities avoid a moving Full target that would make older conforming players appear incomplete. |
| 2026-08-07 | An unqualified conforming OMD Player must play every codec permitted by the stable core format. Codec subsets cannot claim general player conformance. | A physical OMD release should reliably play in an OMD Player; arbitrary codec capability declarations would recreate the compatibility uncertainty the format is meant to remove. |
| 2026-08-07 | A `.omd` file is one release represented as a deterministic, store-only ZIP64 archive with package contents at its root. Physical media keeps the unpacked package directly at its root. | This provides one portable download and library file while remaining inspectable with ordinary ZIP tools and keeping minimal physical players free of archive requirements. |
| 2026-08-07 | One physical OMD medium contains one release directly at its root. USB devices and folders may hold many standalone `.omd` files or package directories as library storage, without becoming indexed OMD volumes. Multi-release physical media is deferred. | This preserves insert-and-play behavior and the one-object, one-album metaphor while avoiding collection-selection, autoplay, integrity, rip, label, and player UI complexity that does not solve a current need. This supersedes the two volume-composition decisions below. |
| 2026-08-06 | **Superseded 2026-08-07.** Every written or removable medium uses `OMD-VOLUME.json` plus `RELEASES/<id>/`, even for one release. Local package directories and `.omd` files remain standalone representations. | One discovery layout initially appeared simpler, but it made every physical-media workflow and player handle collections without a demonstrated user need. |
| 2026-08-06 | Core `id` is a random UUID generated once per authored OMD release. It survives copying, binding changes, representation changes, and optional enrichment; track order, track-list, or audio-content changes require a new ID. | The ID identifies one release across physical and digital representations without duplicating checksums or pretending to be a universal database identifier. |
| 2026-08-06 | OMD is private and pre-stable. Draft formats and packages receive no backward-compatibility guarantee; they may be regenerated or replaced. Compatibility guarantees begin only with the first stable format release. | No public release or third-party ecosystem exists yet. Preserving draft mistakes would make the eventual stable contract worse without protecting real users. |
| 2026-08-06 | **Refined 2026-08-08.** MP3 releases preserve existing CBR or VBR audio. CBR uses one album-level bitrate; VBR uses an album mode plus measured per-track bitrate, from which players may show a range. No album-average bitrate is stored. | Common purchased MP3 albums may be VBR. Re-encoding an already uniform MP3 release merely to force CBR is unnecessary. |
| 2026-08-06 | Every track in a release shares one mandatory album-level audio profile: codec, sample rate, channel count, and applicable measured facts. Creation normalizes incompatible tracks or rejects them; mixed profiles and per-track fidelity overrides are not allowed except measured VBR bitrate. | Studio and other players need one factual album-level description without parsing every track. |
| 2026-08-06 | The next core baseline uses a stable top-level `id` separate from `title`, keeps checksums as the sole content-integrity mechanism, and requires album and per-track display artist credits plus per-track duration. Optional release catalog metadata uses an official extension. | This follows established album metadata practice while keeping the core focused on identity, attribution, verification, and playback. |
| 2026-08-06 | Cover and additional artwork use an official optional `org.openmediadisc.artwork` extension and are strongly recommended. A package without artwork remains conforming and playable. | Artwork is central to the OMD experience, but requiring it would reject valid releases and burden minimal readers with a presentation feature that is not necessary for playback. |
| 2026-08-06 | Optional official and third-party capabilities share one namespaced `extensions` mechanism. Official extensions use `org.openmediadisc.*`; extensions are independently versioned, safely ignorable, checksum-covered, and never required for core playback. | This keeps the main manifest standardized and stable while allowing official evolution and community experimentation without repeated format-wide breaking changes. |
| 2026-08-05 | The next format must be forward-compatible: readers ignore unknown fields, validators warn rather than fail, rewriters preserve unknown fields when practical, and third parties use namespaced extensions. | The sealed v0.1 schema makes every additive field a breaking change and prevents safe ecosystem experimentation. |
| 2026-08-05 | OMD remains a music-release format. Rich supporting material may include music videos and animated artwork, but standalone movies and general video are deferred to a possible future profile. | This supports a differentiated physical album object without turning the next format revision into a general media system. |
| 2026-08-05 | **Partially superseded 2026-08-07.** The core object is one verifiable music-release package. Physical media are bindings; the standard retains a directory representation and adds a single-file `.omd` representation. The proposed multi-package volume composition was rejected. | The shared release contract remains useful, but multi-release physical media weakened the one-object, one-album interaction and added unsupported complexity. See [`format-direction.md`](./format-direction.md). |
| 2026-08-05 | OMD's strategic north star is to make the digital-to-physical album experience so good that collectors and independent artists adopt it before dedicated hardware exists. Commodity media and open software bootstrap demand; the future cartridge is the flagship physical experience, not a gate around the format. | This reflects the project's actual personal workflow, the unmet need among collectors and independent artists, and the practical need to create grassroots demand before investing in cartridge hardware. See [`strategy.md`](./strategy.md). |
| 2026-08-04 | Planning lives in `.github/planning/` (agent-facing), not in `documentation/`. `documentation/` stays user-facing and describes what exists. | Keeps the public docs clean; the planning control plane sits next to the prompts and instructions that consume it. |
| 2026-08-04 | Hardware milestones are **parked, not cancelled**, and preserved in [`hardware-milestones.md`](./hardware-milestones.md) with prompts in [`../prompts/hardware/`](../prompts/hardware/README.md). | Hardware cannot be verified by an agent and gates on bench time. Adoption is a software problem first. |
| 2026-08-04 | Completed prompt chains are archived under `../prompts/archive/<chain>/`, never deleted. | The gotchas and decisions in a finished chain stay useful; the live prompt folder stays readable. |
| 2026-08-04 | The strategic goal is **ecosystem breadth**: OMD becomes dominant through a large software ecosystem, not through a single flagship app. | Stated by the user at the start of the ecosystem planning phase. |
| 2026-07 | `@open-media-disc/studio` versions and tags **per package** (`studio-v0.2.0`), because `v0.1.0` and `v0.2.0` were taken by the CLI milestone. | Avoids tag collisions across packages in the monorepo. |
| 2026-07 | Themes are `--omd-*` token maps only. A theme never ships CSS or JS and never changes layout. | Keeps layout and accessibility guarantees stable across every theme, including on the Pi panel. |
| 2026-07 | Format version (`omdVersion`) and software versions move independently. `omdVersion` stays 0.1.0. | A tool release must never silently change the disc format. |

## Durable facts worth carrying between chats

These are repository-level truths, not milestone state. The archived
[`redesign-status.md`](../prompts/archive/studio-redesign/redesign-status.md)
has a longer list specific to Studio's CSS and build.

- The Studio version lives in **two** places that must move together:
  `packages/studio/package.json` and `STUDIO_VERSION` in
  `packages/studio/src/main/main.ts`.
- `tsc` runs with `noUnusedLocals` / `noUnusedParameters`, so dead code is a
  **build error**. Delete as you go.
- Studio's CSP forbids inline `style=`. Dynamic styling goes through CSSOM
  `setProperty`.
- The Studio browser preview is unreliable (`window.omd` is undefined). Use the
  headless screenshot harness for layout audits, and the user for behavior.
- One codec per package. User-facing surfaces report the codec and applicable
  measured facts, never `lossless` or `lossy` category labels or audio-history
  claims.

## How to update this file (every step prompt must do this)

1. Update **Current milestone**: which step just finished, which is next, and any
   change to what it is blocked on.
2. Update **Repository state** if the last commit, versions, or gates changed.
3. Add or resolve rows in **Active blockers**.
4. Append to **Decisions made** if a choice was made that a future chat could get
   wrong. Newest first.
5. On milestone completion, move the milestone into **Completed milestones** and
   set Current milestone to the next one from
   [`ROADMAP.md`](./ROADMAP.md).
6. Update the "Last updated" date at the top.
