**OAC Multi-Language Library Publishing Strategy**

Version 0.1

*Companion strategy for OAC Studio Alpha and the Optical Album Cartridge format*

| **Project** | OAC / Optical Album Cartridge |
|----|----|
| **Document purpose** | Define how to publish OAC libraries across multiple programming languages without fragmenting the format. |
| **Primary audience** | Core maintainers, app developers, hardware/player developers, and future community contributors. |
| **Status** | Draft v0.1 - strategy and architecture guidance |

# 1. Executive Summary

**The OAC software ecosystem should be spec-first, not implementation-first.** The format must be defined by written specifications, JSON schemas, conformance fixtures, and validation rules. Individual language libraries should implement that shared contract rather than becoming separate, drifting versions of OAC.

The recommended strategy is to publish one fast reference implementation first, then add language-specific libraries and bindings in a controlled order. Python remains the best Milestone 1 workbench for packaging, validation, burning, and label generation. TypeScript should follow because it will power desktop and web tooling. Rust can become the long-term strict core for cross-platform command-line tools, native app backends, embedded player logic, and bindings into other languages.

- Define the OAC format independently from any programming language.

- Start with a Python reference implementation for rapid local tooling.

- Publish a TypeScript library early for app, web, and desktop UI ecosystems.

- Add Rust later as the long-term portable engine when the spec stabilizes.

- Use shared conformance tests so every implementation produces and validates the same artifacts.

# 2. Core Principle: Spec First, Libraries Second

The most important architectural rule is that OAC should not mean "whatever the Python CLI happens to output." OAC should be a documented, stable media package format. The CLI, desktop app, player firmware, and language libraries are consumers and producers of that format.

| **Layer** | **Purpose** | **Source of truth** |
|----|----|----|
| Format specification | Defines required files, disc layout, metadata, validation rules, and compatibility constraints. | Markdown specs and schema files |
| Manifest schema | Defines machine-checkable album/disc metadata. | JSON Schema |
| Conformance fixtures | Provide known-good and known-bad examples every implementation must pass. | Shared test corpus |
| Reference implementation | Demonstrates correct behavior and drives early tooling. | Python package |
| Language libraries | Expose OAC parsing, validation, packaging, and inspection to different developer ecosystems. | Python, TypeScript, Rust, and future bindings |

**Design constraint:** Never let a language library silently define new OAC behavior. Any behavior that affects interoperability belongs in the written spec first.

# 3. Required Spec Artifacts

Before publishing multiple libraries, create a small set of canonical documents and machine-readable schemas. These artifacts should live at the root of the repository and should be versioned independently from implementation packages.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th>spec/<br />
OAC_FORMAT_SPEC.md<br />
OAC_DISC_LAYOUT.md<br />
OAC_MANIFEST_SCHEMA.json<br />
OAC_LABEL_TEMPLATE_SPEC.md<br />
OAC_CONFORMANCE.md<br />
examples/<br />
valid-minimal-manifest.json<br />
valid-full-manifest.json<br />
invalid-missing-track.json<br />
invalid-bad-checksum.json</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Spec artifact** | **What it defines** |
|----|----|
| OAC_FORMAT_SPEC.md | High-level format identity, media assumptions, versioning, required capabilities, and compatibility rules. |
| OAC_DISC_LAYOUT.md | Required paths such as OAC-MANIFEST.json, COVER.jpg, AUDIO/, BOOKLET.pdf, and CHECKSUMS.sha256. |
| OAC_MANIFEST_SCHEMA.json | Machine-checkable JSON schema for the OAC manifest. |
| OAC_LABEL_TEMPLATE_SPEC.md | Label dimensions, safe zones, supported templates, image requirements, and print/export expectations. |
| OAC_CONFORMANCE.md | Rules for certification, test fixtures, expected validation errors, and package compatibility guarantees. |

# 4. Recommended Implementation Order

Do not attempt full multi-language parity on day one. The correct order is to stabilize the format, prove it with one implementation, then add ecosystem libraries where they unlock practical value.

| **Stage** | **Deliverable** | **Purpose** | **Priority** |
|----|----|----|----|
| 1 | OAC manifest schema | Defines the core album/disc metadata contract. | Mandatory |
| 2 | Python reference implementation | Builds and validates real OAC packages quickly for Milestone 1. | Mandatory |
| 3 | TypeScript @oac/core | Powers desktop UI, web validation, label tools, and future app workflows. | High |
| 4 | Shared conformance tests | Prevents Python, TypeScript, and future libraries from drifting. | Mandatory before broad release |
| 5 | Rust oac-core | Provides a strict, portable long-term engine for CLI, native apps, embedded/player software, and bindings. | Medium after spec stability |
| 6 | Language bindings | Expose Rust core to Python, Node, and possibly mobile/embedded stacks. | Later |

# 5. Library Responsibilities

Each implementation should expose the same conceptual API. However, not every package should include burning, label rendering, playback, or operating-system integration. The core libraries should focus on format correctness.

| **API area** | **Required in core libraries?** | **Notes** |
|----|----|----|
| parseManifest() | Yes | Read and parse OAC-MANIFEST.json. |
| validateManifest() | Yes | Validate against the current JSON schema and compatibility rules. |
| validatePackage() | Yes | Check disc/package structure, listed files, audio paths, and checksums. |
| createManifest() | Yes | Create a manifest from track metadata and project settings. |
| calculateChecksums() | Yes | Generate SHA-256 values for track files and package verification. |
| inspectPackage() | Yes | Summarize artist, album, track count, size, media type, and version. |
| estimateDiscSize() | Yes | Confirm whether a package fits the target 8cm DVD-RW capacity. |
| burnDisc() | No | Keep optical writing in a separate OS-specific package/tool. |
| generateLabelPdf() | Optional separate package | Useful but should not be required by the core parser/validator. |
| playDisc() | No | Playback belongs in a player app or hardware stack, not the core format library. |

**Separation rule:** Core libraries understand OAC packages. Burner tools write OAC packages to optical media. Player apps consume OAC packages as music objects.

# 6. Package Naming Strategy

Package names should make it obvious whether a library is the core format layer, a studio application, a label tool, or a hardware/player component.

| **Ecosystem** | **Suggested packages** | **Primary use** |
|----|----|----|
| Python | oac-format, oac-studio, oac-cli | Reference implementation, local packaging, validation, burning orchestration, label generation. |
| TypeScript | @oac/core, @oac/manifest, @oac/label, @oac/studio | Desktop app, web tools, UI workflows, label designer, package inspection. |
| Rust | oac-core, oac-cli | Long-term strict engine, cross-platform CLI, native app backend, future embedded/player support. |
| Future bindings | oac-core-node, oac-core-python | Bindings over Rust core after the format stabilizes. |

# 7. Repository Architecture

A monorepo is recommended at the beginning because OAC requires shared specs, shared fixtures, shared examples, and tight coordination between implementations. Splitting into separate repositories too early increases the risk of drift.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th>oac/<br />
spec/<br />
OAC_FORMAT_SPEC.md<br />
OAC_DISC_LAYOUT.md<br />
OAC_MANIFEST_SCHEMA.json<br />
OAC_LABEL_TEMPLATE_SPEC.md<br />
OAC_CONFORMANCE.md<br />
<br />
test-fixtures/<br />
valid/<br />
minimal-oac-package/<br />
full-oac-package/<br />
invalid/<br />
missing-manifest/<br />
bad-checksum/<br />
duplicate-track-number/<br />
<br />
implementations/<br />
python/<br />
oac_format/<br />
tests/<br />
typescript/<br />
packages/oac-core/<br />
packages/oac-label/<br />
rust/<br />
crates/oac-core/<br />
crates/oac-cli/<br />
<br />
apps/<br />
oac-studio-alpha/<br />
oac-cli/<br />
<br />
docs/<br />
roadmap/<br />
decisions/<br />
release-notes/</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 8. Conformance Test Strategy

Multi-language publishing only works if every implementation is tested against the same data. The shared fixture corpus is more important than any one library.

- Every implementation must parse all valid fixture manifests without errors.

- Every implementation must reject invalid fixture packages with the same error category.

- Every implementation must compute the same checksums for sample audio placeholders or binary fixtures.

- Every implementation must generate equivalent manifests from the same normalized track metadata.

- Every implementation must respect the same media-capacity warnings and filename rules.

| **Fixture type** | **Example** | **Expected result** |
|----|----|----|
| Valid minimal package | Manifest plus one FLAC track and cover art | Pass |
| Valid full package | Manifest, multiple tracks, cover, booklet, checksums | Pass |
| Missing manifest | No OAC-MANIFEST.json | Fail: missing required file |
| Bad checksum | Track hash differs from manifest/checksum file | Fail: checksum mismatch |
| Duplicate track number | Two files marked track 03 | Fail: invalid track ordering |
| Oversized package | Package exceeds safe 8cm DVD-RW capacity | Warn or fail depending on strictness mode |

# 9. Versioning and Compatibility

OAC needs separate version numbers for the format and for each software package. A Python package version bump should not imply a new disc format version. A format version bump should be deliberate and documented.

| **Version type** | **Example** | **Meaning** |
|----|----|----|
| Format version | OAC-FLAC-DATA v0.1 | Defines disc layout, manifest fields, validation rules, and compatibility. |
| Manifest schema version | schema 0.1.0 | Defines the JSON validation contract. |
| Library version | oac-format 0.1.3 | Implementation release with bug fixes or API additions. |
| App version | OAC Studio Alpha 0.1.0 | User-facing tool release. |

- Use semantic versioning for libraries and apps.

- Use explicit compatibility fields in OAC-MANIFEST.json.

- Do not introduce breaking manifest changes without a new format version.

- Maintain a compatibility table in the spec repository.

- Keep older validators available so early prototype discs remain inspectable.

# 10. Governance and Release Discipline

Because OAC is meant to become an open format, changes should be reviewed through lightweight design records. This prevents the format from becoming a pile of ad hoc tool behavior.

| **Decision area** | **Governance rule** |
|----|----|
| Manifest fields | Any new required field needs a short design note and schema update. |
| Disc layout | Required paths should change only across format versions. |
| Audio support | FLAC remains the Milestone 1 baseline; additional codecs must be optional extensions. |
| Burning behavior | OS-specific burning belongs outside the core format libraries. |
| Validation errors | Standardize error categories so multiple languages can report equivalent failures. |
| Label templates | Template changes should preserve safe print zones and not affect package validity. |

# 11. Near-Term Action Plan

The next implementation step should be small and concrete: publish the format contract and build the first library around it.

1.  Create the spec folder and draft OAC_FORMAT_SPEC.md, OAC_DISC_LAYOUT.md, and OAC_MANIFEST_SCHEMA.json.

2.  Create three valid sample manifests and three invalid sample manifests.

3.  Build the Python oac-format package with manifest parsing, validation, package inspection, and checksum generation.

4.  Add a CLI wrapper for create, validate, inspect, and verify commands.

5.  Add TypeScript @oac/core after the Python behavior and fixtures stabilize.

6.  Introduce a conformance test command that every implementation can run against the shared fixtures.

7.  Defer Rust until the format has survived several real burned-disc tests.

# 12. Final Recommendation

**Publish OAC as a format first and as software second.** The format should be defined by specs, schema files, fixtures, and conformance tests. Python should be the first reference implementation because it is the fastest way to prove the Milestone 1 disc workflow. TypeScript should follow to support OAC Studio, desktop UI, web tools, and label design. Rust should become the serious long-term core only after the format stabilizes.

The goal is not to create three separate OAC implementations. The goal is to create one OAC format with multiple trustworthy language interfaces.
