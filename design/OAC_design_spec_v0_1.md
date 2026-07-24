**Optical Album Cartridge**

**Design Specification v0.1**

*A rewritable 8cm DVD-RW album cartridge format inspired by MiniDisc and UMD*

| **Field** | **Value** |
|----|----|
| Working name | Optical Album Cartridge (OAC) |
| Document status | Concept / prototype design spec |
| Version | 0.1 |
| Primary medium | 8cm mini DVD-RW, approximately 1.4 GB |
| Primary audio storage | FLAC files on an optical data disc |
| Primary user experience | MiniDisc-like album object: burn, label, insert, play, erase, reburn |
| Primary hardware target | Dedicated cartridge player/recorder with USB-C writing support |

# 1. Executive Summary

Optical Album Cartridge (OAC) is a proposed physical music format that combines the object satisfaction of MiniDisc, the cartridge ergonomics of Sony UMD, and the practicality of commodity 8cm DVD-RW optical media. The format stores album audio as FLAC files on a rewritable 8cm DVD-RW data disc. The long-term product vision is a portable player/recorder that accepts the full cartridge, spins the disc inside the cartridge, reads the manifest, and plays the album like a CD or MiniDisc.

The v0 prototype deliberately starts without a cartridge. The first milestone is to prove the media/software layer using bare 8cm DVD-RW discs: burn FLAC albums, generate a manifest, print disc art, verify playback, and build a simple software workflow. The cartridge and cartridge-native optical drive become later mechanical milestones rather than day-one blockers.

# 2. Product Motivation

The target use case is not mass-market replacement of CDs, vinyl, or streaming. The target use case is a low-cost, reusable, personally satisfying physical album object. The user buys a digital album, writes it to a small rewritable optical disc, applies a label or printed art, and gets a finished physical object without escalating into expensive vinyl collecting.

- MiniDisc succeeds emotionally because recorded blanks feel legitimate rather than inferior to a commercial pressing.

- CD-R succeeds technically but often feels like a homemade substitute for a pressed CD.

- SD cards succeed as storage but fail as album objects because they have little shelf presence, no optical ritual, and poor label/display affordance.

- OAC should optimize for album-object psychology while using mature, cheap, rewritable optical media underneath.

# 3. Goals and Non-Goals

| **Goals** | **Non-goals** |
|----|----|
| Create a satisfying rewritable physical album object. | Do not attempt to make DVD-RW readable by normal CD players. |
| Use 8cm DVD-RW as the commodity storage substrate. | Do not make DVD-Audio the core authoring standard. |
| Store albums as FLAC data with artwork and metadata. | Do not require custom cartridge hardware for the first prototype. |
| Support erase-and-reburn workflows similar in spirit to MiniDisc/NetMD. | Do not optimize for universal consumer DVD player compatibility at v0. |
| Eventually support cartridge-native insertion and playback. | Do not glue the media into a permanently sealed cartridge during early development. |

# 4. Core Design Principles

- The cartridge is the format; the DVD-RW is the storage layer.

- The disc should be technically recoverable and readable outside the custom ecosystem whenever possible.

- The normal write workflow should be full-disc erase, rebuild, burn, verify, and eject.

- The player should hide the file system and behave like a dedicated music device.

- The physical object should feel complete with a cartridge label and optional disc face art; full jewel-case artwork should not be required.

- The v0 prototype must remain achievable with commodity drives and bare 8cm DVD-RW media.

# 5. Target User Stories

| **ID** | **User story** | **Acceptance criteria** |
|----|----|----|
| US-01 | As a listener, I can buy a digital album and write it to an OAC disc. | The disc contains verified FLAC files, manifest, cover art, and checksums. |
| US-02 | As a listener, I can insert the disc/cartridge into a dedicated player and play it like a CD. | The device shows album title, artist, track list, and supports play/pause/next/previous. |
| US-03 | As a listener, I can erase and reburn a cartridge with a different album. | The software performs a clean blank/rebuild/burn/verify workflow. |
| US-04 | As a collector, I can print/apply artwork so the object feels finished. | The label template supports album title, artist, spine/edge text, and cover artwork. |
| US-05 | As a developer, I can recover the files using a normal computer drive. | Bare-disc mode uses a readable optical filesystem and standard file formats. |

# 6. Format Architecture

OAC uses a layered architecture. The physical disc remains a commodity 8cm DVD-RW. The OAC-specific behavior comes from a defined filesystem layout, manifest file, software burner, and dedicated player firmware.

| **Layer** | **Specification** |
|----|----|
| Physical medium | 8cm mini DVD-RW; rewritable; approximately 1.4 GB usable class. |
| Filesystem | UDF or ISO/UDF hybrid image for broad optical-media readability. |
| Audio codec | FLAC as the native audio payload. 16-bit/44.1 kHz recommended baseline. |
| Metadata | OAC-MANIFEST.json as the authoritative album metadata file. |
| Artwork | COVER.jpg or COVER.png; optional booklet PDF and label assets. |
| Integrity | CHECKSUMS.sha256 for post-burn verification and long-term confidence. |
| Playback model | Player reads manifest first and presents album mode rather than folder browsing. |

# 7. Disc Layout

The baseline file tree should be simple, deterministic, and easy to validate:

/OAC-MANIFEST.json\
/COVER.jpg\
/BOOKLET.pdf \# optional\
/LABEL/ \# optional printable templates/assets\
/AUDIO/\
01 - Track Name.flac\
02 - Track Name.flac\
03 - Track Name.flac\
/CHECKSUMS.sha256

Rules:

- Track files must be numbered in playback order.

- The manifest is required and must be located at the disc root.

- Cover art is strongly recommended and should be referenced by the manifest.

- Checksums are required for discs created by official OAC burner software.

- The player should ignore unrelated files unless a developer/debug mode is enabled.

# 8. Manifest Schema

The manifest is the bridge between a generic data disc and a dedicated album object.

{\
"format": "OAC",\
"format_name": "Optical Album Cartridge",\
"version": "0.1",\
"media": "8cm DVD-RW",\
"artist": "Artist Name",\
"album": "Album Name",\
"year": 2026,\
"cover": "/COVER.jpg",\
"audio_codec": "FLAC",\
"recommended_playback": "gapless",\
"tracks": \[\
{"number": 1, "title": "Track Name", "path": "/AUDIO/01 - Track Name.flac"},\
{"number": 2, "title": "Track Name", "path": "/AUDIO/02 - Track Name.flac"}\
\]\
}

# 9. Why Not DVD-Audio as the Core Standard?

DVD-Audio should be treated as an optional export mode, not the native OAC format. DVD-Audio is an existing high-fidelity optical audio standard, but it is optimized for authored audiophile releases and niche compatible players. OAC is optimized for cheap, repeatable, personal album writing and rewriting.

| **Criterion** | **DVD-Audio** | **OAC FLAC Data Mode** |
|----|----|----|
| Primary use | Authored hi-fi disc release | Rewritable personal album cartridge |
| Capacity fit on 8cm DVD-RW | Can be tight, especially high-res/multichannel | Usually good for full albums in FLAC |
| Write workflow | Author disc structure, then burn | Package files, write manifest, burn, verify |
| Player complexity | Requires DVD-Audio navigation/decoding support | Requires UDF/filesystem, JSON, FLAC decode |
| Computer recovery | Less transparent to normal users | Files are directly browsable and recoverable |
| Recommendation | Optional future mode | Core v0/v1 mode |

# 10. Burning and Reburning Workflow

The preferred model is full-album rewriting, not random file mutation.

| **Step** | **Operation** |
|----|----|
| 1 | User selects source album folder or drag-drops FLAC files into the OAC burner app. |
| 2 | App reads FLAC metadata, validates track order, and requests missing album/artist/cover fields. |
| 3 | App generates OAC-MANIFEST.json and CHECKSUMS.sha256. |
| 4 | App builds a temporary ISO/UDF image. |
| 5 | App blanks the DVD-RW if needed. |
| 6 | App burns the image to the 8cm DVD-RW. |
| 7 | App verifies checksums from the written disc. |
| 8 | App ejects the disc/cartridge and displays a printable label preview. |

# 11. Hardware Roadmap

| **Phase** | **Hardware target** | **Purpose** |
|----|----|----|
| H0 | Bare 8cm DVD-RW + normal computer DVD burner | Prove burn/reburn workflow and file layout immediately. |
| H1 | Desktop/home prototype using USB slim DVD-RW drive + Raspberry Pi or mini PC | Prove OAC playback UI, manifest parsing, and FLAC output. |
| H2 | Portable prototype using slim optical mechanism, battery, display, buttons, DAC, and buffer storage | Prove portable playback and shock/power behavior. |
| H3 | Cosmetic/removable cartridge shell | Prove object feel and label system while keeping disc removable. |
| H4 | Cartridge-native reader/writer | Insert cartridge; shutter opens; disc spins inside shell; player reads/writes via USB-C. |

# 12. Cartridge Design Requirements

The final cartridge should be serviceable and should allow the 8cm DVD-RW disc to spin inside the shell during native playback. The disc should also be removable for fallback burning/recovery in a standard computer drive.

- Disc remains inside shell during native playback and writing.

- Cartridge opens with screws or a durable latch; no permanent glue in prototype versions.

- Sliding shutter protects optical surface and opens fully inside the player.

- Center hub access allows the spindle to clamp the disc directly.

- Radial optical window allows laser pickup travel across the read/write area.

- Internal clearance prevents disc rub at full spin speed.

- Shell rigidity prevents flexing into the spinning disc.

- Large label area supports album art, artist, title, and edition metadata.

- Orientation/keying prevents incorrect insertion.

# 13. Cartridge-Native Drive Requirements

| **Subsystem** | **Requirement** |
|----|----|
| Loading | Accept cartridge, lock it, open shutter, expose hub and read/write aperture. |
| Spindle | Clamp the 8cm disc through the cartridge hub opening without clamping the shell. |
| Optical pickup | Read/write DVD-RW through cartridge aperture with full radial access. |
| Ejection | Stop disc, close shutter, release cartridge, and prevent ejection while spinning. |
| Dust management | Minimize dust ingress during insertion and shutter opening. |
| Shock handling | Buffer audio to RAM/internal flash and spin down when practical. |
| USB-C mode | Expose player/recorder to desktop app for burn, erase, verify, and metadata operations. |

# 14. Player Experience

The player should behave like a dedicated album machine, not like a file browser.

- On insert, read OAC-MANIFEST.json and display artist, album, track count, and cover art if available.

- Default to album-order playback.

- Support play/pause, next, previous, fast seek, repeat, shuffle optional, and resume position.

- Support gapless playback as a first-class requirement.

- Display codec, sample rate, and remaining time in an optional info screen.

- Cache current/next tracks or full album to reduce spin time, improve battery life, and reduce shock sensitivity.

- Treat a malformed disc as recoverable: show diagnostics rather than generic failure.

# 15. Desktop Burner Software

| **Module** | **Responsibility** |
|----|----|
| Album importer | Accept folders, read FLAC tags, validate track numbering, detect missing cover art. |
| Metadata editor | Edit artist, album, year, track titles, edition notes, and artwork. |
| Image builder | Create deterministic UDF/ISO image with manifest, audio, artwork, booklet, and checksums. |
| Burn backend | Blank DVD-RW, burn image, verify disc contents, and eject. |
| Label generator | Generate printable disc/cartridge label from manifest and cover art. |
| Device bridge | Later: communicate with cartridge player/recorder over USB-C. |

# 16. Prototype Milestones

| **Milestone** | **Definition of done** |
|----|----|
| M1: Bare-disc proof | At least 5 albums are burned to bare 8cm DVD-RW, verified, mounted on multiple computers, and played through a software player. |
| M2: OAC file spec | Manifest schema, folder layout, checksum rules, and artwork conventions are documented and stable enough for prototype use. |
| M3: Burner app alpha | App can import FLAC album, build image, burn DVD-RW, verify, and eject. |
| M4: Home-deck prototype | Device reads bare 8cm disc, parses manifest, displays album, and plays FLAC through DAC/line out. |
| M5: Cosmetic cartridge | Disc can be stored in a labelable cartridge and removed for standard-drive burning. |
| M6: Cartridge-native mechanism concept | CAD/proof-of-mechanism demonstrates shutter, spindle access, disc spin clearance, and optical aperture. |
| M7: Cartridge-native reader/writer | Device reads and writes the disc while it remains inside the cartridge. |

# 17. Risks and Open Questions

| **Risk / Question** | **Mitigation / Decision path** |
|----|----|
| 8cm DVD-RW media availability may decline. | Use commodity media while available; maintain fallback support for 8cm DVD-R and possibly 12cm development media. |
| Slot-loading drives may not support 8cm discs safely. | Use tray-loading or custom cartridge mechanism; avoid unsupported slot drives. |
| Portable optical playback is power-hungry and shock-sensitive. | Use buffering/caching and spin-down strategy. |
| Cartridge-native optical alignment may be difficult. | Start with removable-disc cartridge; design H4 only after software/media stack works. |
| DVD-Audio compatibility temptation may distract from core UX. | Keep DVD-Audio as optional export mode only. |
| Label/art process could become too elaborate. | Default to cartridge label plus optional printed disc face; avoid mandatory jewel-case production. |
| Legal/commercial ambiguity around distributing burned purchased music. | Use for personal owned-library prototypes; address artist/label licensing separately for commercial releases. |

# 18. Success Criteria

- A user can create a finished OAC album object from a legally acquired digital album in under ten minutes after setup.

- The album plays from a dedicated device without exposing folders or file-management concepts.

- The disc can be erased and rewritten repeatedly with predictable results.

- The physical object feels satisfying enough to reduce the impulse to buy expensive vinyl variants.

- The system remains debuggable because files can be recovered from the bare disc with a normal computer drive.

- The cartridge roadmap does not block early validation of the format.

# 19. Recommended Immediate Next Steps

| **Priority** | **Action** |
|----|----|
| 1 | Buy a small pack of 8cm DVD-RW discs and confirm burner/drive compatibility. |
| 2 | Create 3 to 5 sample OAC discs from FLAC albums using manual folder layout. |
| 3 | Define the v0.1 manifest schema and checksum convention. |
| 4 | Build a small command-line tool that packages album folders into OAC-ready disc images. |
| 5 | Print disc labels or direct-to-disc art to test object satisfaction. |
| 6 | Prototype a simple player UI on a Raspberry Pi or mini PC using a USB DVD-RW drive. |
| 7 | Only after the software/media loop feels good, begin CAD for the removable cartridge shell. |

# 20. Working Definition

Optical Album Cartridge is a rewritable optical music object built on 8cm DVD-RW media. Its native format is a FLAC data disc with a standardized manifest, artwork, checksums, and player behavior. It is not a CD, not DVD-Audio, not an SD card, and not a vinyl replacement. It is a MiniDisc-like ritual format for affordable personal album ownership.

# Appendix A: v0 Naming

| **Name** | **Use** |
|----|----|
| OAC | Short technical name: Optical Album Cartridge. |
| OAC-FLAC | Native data-disc mode using FLAC audio files. |
| OAC Disc | Bare 8cm DVD-RW written with OAC file layout. |
| OAC Cartridge | Serviceable shell containing an OAC Disc. |
| OAC Player/Recorder | Dedicated device that plays and eventually writes OAC Cartridges. |
