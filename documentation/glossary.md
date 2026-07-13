# Glossary

Terminology for the Open Media Disc project and OMD Core v0.1.

| Term | Meaning |
| --- | --- |
| **OMD** | Open Media Disc, an open-source physical music format. |
| **OMD-FLAC-DATA** | The v0.1 native data format: FLAC audio plus a manifest, artwork, and checksums, stored as a plain directory / data disc. |
| **OMD package** | A directory tree conforming to the OMD disc layout. The unit OMD Core creates, validates, and inspects. |
| **Manifest** | `OMD-MANIFEST.json` at the package root. The authoritative album table of contents: metadata, track order, paths, sizes, and per-track checksums. |
| **Disc ID** | The editable disc title stored as `discId` in the manifest. Full Unicode; defaults to the album title and need not be unique. Legacy `OMD-000NNN` identifiers remain valid. |
| **Cartridge** | The long-term physical shell that holds an 8cm DVD-RW so it can spin and be read/written in place. Not part of v0.1. |
| **8cm DVD-RW** | The commodity rewritable optical medium OMD targets (~1.4 GB usable). |
| **Capacity budget** | The usable byte limit for the target medium. Default `1,400,000,000` bytes for 8cm DVD-RW. |
| **Checksums file** | `CHECKSUMS.sha256`, a standard `sha256sum`-style integrity list for every package file. |
| **Full-image write** | The burn model: erase and rewrite the whole disc image rather than mutating individual files. |
| **UDF** | The disc filesystem OMD writes when burning (see the format spec). |
| **Disc image** | A burn-ready UDF image of a package, built by `omd image`. |
| **Burn** | Writing a package or image to an 8cm DVD-RW and verifying it (`omd burn`; Windows in v0.2). |
| **Validation error** | A finding that makes a package invalid (e.g. missing manifest, checksum mismatch). |
| **Validation warning** | A recommendation or risk that does not invalidate the package (e.g. missing cover art, over-capacity). |
| **Strict mode** | Validation setting that promotes a capacity overflow from a warning to an error. |
| **STREAMINFO** | The FLAC metadata block OMD reads to derive track duration. |
| **Vorbis comment** | The FLAC tag block OMD reads for artist/album/title/track number. |
| **OMD Core** | The SDK (`@open-album-cartridge/core`) implementing the format contract. |
| **OMD CLI** | The `omd` command-line tool (`@open-album-cartridge/cli`). |
| **OMD Studio** | Future desktop application that will wrap OMD Core for packaging, labeling, and burning. |
| **OMD Pi Player** | Future Raspberry Pi playback device that consumes OMD packages. |
| **Writer Dock** | Future dedicated device that erases, burns, and verifies OMD discs. |
