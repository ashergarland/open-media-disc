**Optical Album Cartridge**

OAC Studio Alpha\
Milestone 1 Software Spec

Version 0.1 - July 8, 2026

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Mission</strong></p>
<p>Build a repeatable album-to-disc toolchain that turns owned FLAC albums into verified 8cm DVD-RW OAC bare-disc prototypes with metadata, cover art, checksums, burning, verification, and printable labels.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Core promise: Select album -\> validate -\> package -\> label -\> burn -\> verify -\> eject.**

# 1. Executive Summary

OAC Studio Alpha is the Milestone 1 software package for the Optical Album Cartridge project. Its job is to make a bare 8cm DVD-RW behave like the first version of a real music format: a FLAC album package with a manifest, artwork, checksum verification, and a repeatable burn workflow.

The software should feel closer to NetMD-style album writing than generic disc burning. The alpha can be command-line first, but it should be architected so a simple desktop app can wrap the same core modules later.

| **Input** | **Output** | **Success Criteria** |
|----|----|----|
| Folder of owned FLAC files plus cover art | Burned and verified 8cm DVD-RW OAC disc plus printable label PDF | Disc is readable, inspectable, replayable, and reburnable using a consistent OAC structure |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Primary milestone question</strong></p>
<p>Can we make a reusable 8cm FLAC album disc that feels controlled, satisfying, and repeatable before any cartridge hardware exists?</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Scope

## 2.1 In Scope

- Create a standardized OAC-FLAC-DATA disc package from a local album folder.

- Generate OAC-MANIFEST.json, cover art placement, checksums, and a clean AUDIO directory.

- Validate package structure before burning.

- Create a burn-ready image or folder.

- Erase, burn, verify, and eject an 8cm DVD-RW through platform-specific burn adapters.

- Generate printable mini CD/DVD label PDFs for early physical prototypes.

- Inspect and optionally play OAC discs from a computer drive.

- Maintain a lightweight local catalog of created discs.

## 2.2 Out of Scope for Milestone 1

- Cartridge CAD, shell manufacturing, shutter mechanism, or cartridge-native optical drive.

- Portable player hardware, embedded firmware, DAC integration, or battery design.

- DRM, authentication chips, online accounts, or artist marketplace infrastructure.

- DVD-Audio authoring, DVD-Video compatibility mode, Blu-ray support, or streaming-service integration.

- Automatic downloading of copyrighted music or album art from online sources.

# 3. Product Philosophy

Milestone 1 should treat the disc as a controlled album package, not as a generic storage volume. The disc is technically a data DVD-RW, but the user experience should be music-first: the tool writes an album, not a folder.

- Full-image writes are preferred over packet-writing for early reliability and repeatability.

- Every burned disc should have a manifest and checksums.

- Every disc should be inspectable by the OAC tooling without guessing track order.

- The output should be physically satisfying enough to test the anti-vinyl, MiniDisc-like ritual.

- The data format should remain simple enough for a future embedded player to parse.

# 4. Software Components

| **Component** | **Purpose** | **Required for Alpha?** |
|----|----|----|
| OAC Packager | Turns an album folder into a standardized OAC package. | Yes |
| OAC Manifest System | Defines album metadata, track order, file paths, checksums, and media metadata. | Yes |
| OAC Validator | Confirms package/disc integrity before and after burning. | Yes |
| OAC Image Builder | Builds a burn-ready optical image or burn folder. | Yes |
| OAC Disc Writer | Erases, burns, verifies, and ejects DVD-RW media. | Yes |
| OAC Label Generator | Creates printable disc-label PDFs. | Yes |
| OAC Local Catalog | Tracks created discs, burn history, and verification status. | Optional but recommended |
| OAC Inspect | Reads an inserted disc and displays album metadata. | Yes |
| OAC Test Player | Plays tracks from the disc using the manifest order. | Optional but valuable |

# 5. OAC Packager

The packager is the core module. It scans a local album folder, reads FLAC metadata, normalizes filenames, copies artwork, generates a manifest, and produces a clean staging directory.

## 5.1 Example Input

/Floral Shoppe/\
01 Boot.flac\
02 Lisa Frank 420.flac\
cover.jpg

## 5.2 Example Output Package

/OAC-MANIFEST.json\
/OAC-DISC-ID.txt\
/COVER.jpg\
/BOOKLET.pdf\
/AUDIO/\
01 - Track Name.flac\
02 - Track Name.flac\
/CHECKSUMS.sha256

## 5.3 Required Packager Behavior

- Read FLAC metadata: artist, album, year, track number, track title, duration, and embedded artwork when present.

- Sort tracks by disc number and track number when those tags exist.

- Reject missing, duplicate, or ambiguous track numbers unless the user explicitly overrides.

- Detect cover art from common filenames such as cover.jpg, folder.jpg, front.jpg, or embedded FLAC artwork.

- Normalize filenames to cross-platform safe names.

- Estimate package size against the target 8cm DVD-RW capacity budget.

- Generate OAC-MANIFEST.json and CHECKSUMS.sha256.

- Create a clean staging folder with no hidden OS junk files.

# 6. OAC Manifest System

The manifest is the format table of contents. Future hardware should be able to read this file first and immediately know how to present the album.

{\
"oac_format": "OAC-FLAC-DATA",\
"oac_version": "0.1",\
"disc_id": "OAC-000001",\
"media_type": "8cm DVD-RW",\
"filesystem": "UDF",\
"artist": "Artist Name",\
"album": "Album Title",\
"release_year": 2026,\
"audio_codec": "FLAC",\
"track_count": 10,\
"total_duration_seconds": 2512,\
"cover_art": "COVER.jpg",\
"tracks": \[\
{\
"number": 1,\
"title": "Track Name",\
"filename": "AUDIO/01 - Track Name.flac",\
"duration_seconds": 244,\
"sha256": "..."\
}\
\]\
}

## 6.1 Manifest Rules

- OAC-MANIFEST.json must live at the root of the disc.

- Track filenames in the manifest must be relative paths from the disc root.

- Each track should include a SHA-256 checksum.

- The manifest should be stable enough that a future player can parse it without needing internet metadata.

- Version the manifest from the beginning so future changes can be handled gracefully.

# 7. OAC Validator

The validator answers one question: is this a valid OAC package or disc? It should be usable both before and after burning.

oac validate ./build/OAC-000001\
\
oac verify --drive D:

- Confirm the manifest exists and matches the expected schema.

- Confirm all listed tracks exist and are readable FLAC files.

- Confirm track count, duration totals, and checksums.

- Confirm cover art exists or warn if missing.

- Confirm the package fits within the target capacity budget.

- Warn about non-portable filenames, hidden files, or unsupported media assets.

# 8. OAC Image Builder and Disc Writer

The alpha should use a full-disc image model: erase the DVD-RW, build a clean image, burn it, verify it, and eject. This is more reliable than treating the disc like a flash drive.

## 8.1 Recommended Commands

oac build ./AlbumFolder --out ./build/OAC-000001\
oac image ./build/OAC-000001 --out ./dist/OAC-000001.iso\
oac write ./dist/OAC-000001.iso --drive D:\
oac verify --drive D:

## 8.2 Disc Writer States

\[1/6\] Detecting drive\
\[2/6\] Checking DVD-RW media\
\[3/6\] Erasing disc\
\[4/6\] Burning OAC image\
\[5/6\] Verifying checksums\
\[6/6\] Ejecting disc

| **Layer** | **Alpha Strategy** |
|----|----|
| Filesystem | UDF or ISO/UDF hybrid, depending on tooling reliability. |
| Burning | Call platform tools through an adapter instead of writing low-level optical code. |
| Verification | Mount/read the disc and recompute manifest checksums after burning. |
| Media handling | Target DVD-RW first; warn if the inserted disc is not rewritable. |

# 9. OAC Label Generator

The label generator is required because Milestone 1 must test the object ritual, not just the data format. The label can be temporary adhesive mini CD/DVD artwork for the bare-disc phase.

oac label ./build/OAC-000001 --template mini-disc-round --out label.pdf

## 9.1 Initial Label Templates

| **Template** | **Description** |
|----|----|
| Cover Fill | Full cover art cropped to an 8cm circular label. |
| Minimal MD-Style | Artist, album, disc ID, small artwork block, and technical line. |
| Technical Archive | Text-heavy catalog label with album, year, track count, duration, codec, and disc ID. |

## 9.2 Label Content

- Artist and album title.

- Disc ID, such as OAC-000001.

- Technical line: 8cm DVD-RW / FLAC / OAC-FLAC-DATA v0.1.

- Track count and total duration when available.

- Optional OAC logo or mark.

# 10. Local Catalog, Inspect, and Test Player

## 10.1 OAC Local Catalog

A lightweight local catalog should track disc IDs, burn dates, current contents, prior contents if reburned, source folder, label output, and verification status. JSON is acceptable for alpha; SQLite can come later.

oac library list\
\
OAC-000001 Macintosh Plus - Floral Shoppe Verified\
OAC-000002 Blank Banshee - Blank Banshee 0 Verified\
OAC-000003 George Clanton - 100% Electronica Reburned

## 10.2 OAC Inspect

oac inspect --drive D:\
\
OAC Disc Detected\
Disc ID: OAC-000001\
Artist: Macintosh Plus\
Album: Floral Shoppe\
Format: OAC-FLAC-DATA v0.1\
Tracks: 11\
Duration: 43:12\
Size: 423 MB\
Verification: Passed

## 10.3 OAC Test Player

The test player is optional but valuable because it proves the consumption side of the format. It should read the manifest, show the album and track list, play tracks in order, and support next/previous and pause/resume. The UI can be plain for alpha.

# 11. User Interface Plan

## 11.1 CLI First

oac init\
oac create ./AlbumFolder\
oac validate ./OAC-Package\
oac image ./OAC-Package\
oac write ./OAC-000001.iso --drive D:\
oac verify --drive D:\
oac label ./OAC-Package\
oac inspect --drive D:\
oac play --drive D:\
oac library list

## 11.2 Desktop Wrapper Later

OAC Studio Alpha\
\
\[ Select Album Folder \]\
\[ Validate Album \]\
\[ Generate OAC Package \]\
\[ Generate Label PDF \]\
\[ Burn to DVD-RW \]\
\[ Verify Disc \]

The desktop UI should call the same core modules as the CLI. The project should not duplicate packaging, validation, or burning logic between CLI and GUI.

# 12. Recommended Repository Structure

oac-studio/\
apps/\
cli/\
desktop/\
packages/\
oac-core/\
manifest/\
flac/\
validation/\
packaging/\
checksums/\
oac-burn/\
windows/\
macos/\
linux/\
oac-label/\
templates/\
pdf/\
oac-player/\
oac-library/\
examples/\
sample-album/\
sample-manifest/\
docs/\
OAC_FORMAT_v0_1.md\
OAC_MANIFEST_SCHEMA.md\
OAC_DISC_LAYOUT.md

# 13. Recommended Technical Stack

| **Area** | **Alpha Recommendation** | **Reason** |
|----|----|----|
| Core/CLI | Python | Fast file scripting, easy metadata handling, quick iteration. |
| Desktop UI | Later: Tauri, Electron, or a simple Python GUI | Do not polish UI before the format works. |
| FLAC metadata | Python FLAC/tag library | Read track metadata and embedded artwork. |
| Checksums | Built-in SHA-256 hashing | No custom cryptography needed. |
| Label PDFs | SVG/PDF generation | Makes repeatable printable templates. |
| Burning | Platform adapters calling OS tools | Avoid low-level optical burn code in alpha. |
| Catalog | JSON first, SQLite later | Start simple; preserve upgrade path. |

# 14. Milestone 1 Definition of Done

Milestone 1 is complete when the following command sequence works on a real 8cm DVD-RW and produces a verified disc plus label PDF:

oac create "./Albums/Floral Shoppe"\
oac label "./build/OAC-000001"\
oac image "./build/OAC-000001"\
oac write "./dist/OAC-000001.iso" --drive D:\
oac verify --drive D:\
oac inspect --drive D:

Expected success output:

OAC Disc Verified\
\
OAC-000001\
Macintosh Plus - Floral Shoppe\
8cm DVD-RW / FLAC\
11 tracks\
423 MB\
Checksums passed

| **Deliverable** | **Acceptance Test** |
|----|----|
| Valid OAC package | Manifest, AUDIO folder, cover art, and checksums generated correctly. |
| Burned DVD-RW | Disc can be erased, burned, mounted, inspected, and verified. |
| Printable label | Label PDF is generated from album metadata and artwork. |
| Local catalog entry | Disc ID and burn result are recorded locally. |
| Repeatability | A second album can be written to the same DVD-RW after erase/reburn. |

# 15. Suggested Implementation Phases

| **Phase** | **Goal** | **Output** |
|----|----|----|
| 1A | Manual package and manual burn | Confirm 8cm DVD-RW media workflow feels viable. |
| 1B | CLI packager and validator | Generate manifest, clean AUDIO folder, and checksums. |
| 1C | Image builder and verifier | Create image, burn externally, verify disc. |
| 1D | Integrated disc writer | Erase, burn, verify, and eject from one command. |
| 1E | Label generator | Create printable mini disc label PDF. |
| 1F | Inspect/play/catalog polish | Read OAC disc metadata, basic playback, and library tracking. |

# 16. Risks and Mitigations

| **Risk** | **Impact** | **Mitigation** |
|----|----|----|
| 8cm DVD-RW media variability | Some drives may fail to burn/read mini discs reliably. | Test multiple drives and maintain a drive compatibility list. |
| Adhesive label imbalance | Disc vibration or drive reliability issues. | Use labels only for prototypes; move final artwork to cartridge shell. |
| Cross-platform burn complexity | Different OS tooling may behave differently. | Use adapter pattern; stabilize one OS first. |
| Overbuilding the GUI early | Delays core format validation. | Ship CLI first and wrap it later. |
| Disc feels like a data disc | Weakens MiniDisc-like satisfaction. | Use manifest, label, catalog ID, and album-first UX language. |
| Capacity edge cases | Some hi-res albums may exceed 1.4 GB. | Warn early; allow downsampled FLAC or multi-disc sets later. |

# 17. Glossary

| **Term** | **Meaning** |
|----|----|
| OAC | Optical Album Cartridge. |
| OAC-FLAC-DATA | The Milestone 1 native data-disc format: FLAC files plus manifest, art, and checksums. |
| Manifest | Root JSON file that defines album metadata, track order, paths, and checksums. |
| Bare-disc alpha | Prototype phase using raw 8cm DVD-RW media before cartridge hardware exists. |
| Full-image write | Erase and reburn the entire disc image instead of treating the disc like a flash drive. |
| Disc ID | Stable local identifier assigned to a physical disc or cartridge, such as OAC-000001. |

# 18. Final Milestone Policy

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><strong>Milestone 1 policy</strong></p>
<p>Owned files in -&gt; verified OAC disc out. The milestone is successful when the format feels repeatable, inspectable, playable, and physically satisfying before cartridge hardware exists.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

The project should not advance to cartridge CAD or cartridge-native optical drive design until the bare-disc media workflow has been used successfully across multiple albums and at least one erase/reburn cycle per test disc.
