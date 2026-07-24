**OAC**

**OAC Raspberry Pi Product Family Documentation**

*Open Album Cartridge reference hardware tiers, shared software stack, and build roadmap*

v0.1 \| July 8, 2026

Prepared for the Open Album Cartridge project

Open Album Cartridge is an open-source physical music format for rewritable optical album cartridges. The Raspberry Pi product family exists to make the format buildable, testable, playable, and hackable before custom cartridge-native hardware exists.

# Document Control

| **Field** | **Value** |
|----|----|
| Document | OAC Raspberry Pi Product Family Documentation |
| Version | v0.1 |
| Date | July 8, 2026 |
| Status | Planning / product-family architecture |
| Primary platform | Raspberry Pi 5 8GB for the first reference hardware build |
| Project name | OAC = Open Album Cartridge |

# Table of Contents

- 1\. Executive Summary

- 2\. Product-Family Principles

- 3\. Recommended First Build

- 4\. Product Family Overview

- 5\. Shared Hardware Architecture

- 6\. Shared Software Stack

- 7\. Device Tier Specifications

- 8\. Build and Publishing Model

- 9\. Roadmap and Milestones

- 10\. Risks, Unknowns, and Design Rules

- 11\. Appendix: BOM Guidance, Test Plans, Repo Layout, and Sources

# 1. Executive Summary

**The Raspberry Pi product family should be the open-source reference-hardware line for OAC.** The family should begin with a simple, reliable playback device and gradually move toward writer docks, home-deck hardware, portable prototypes, and eventually cartridge-native optical mechanisms. The core idea is to prove OAC as a format before solving the hardest mechanical problem: spinning an 8cm DVD-RW inside a MiniDisc/UMD-style cartridge.

The first device should not be portable and should not be cartridge-native. The first device should be a robust bench/top-table player that proves OAC discs can be detected, mounted, parsed, verified, cached, and played from dedicated hardware.

| **Decision** | **Recommendation** |
|----|----|
| First official Pi target | Raspberry Pi 5 8GB |
| First hardware product | OAC Pi Player Alpha |
| First optical mechanism | External USB tray-loading DVD-RW drive that supports 8cm media |
| First audio output | USB DAC first; I2S DAC HAT later |
| First UI | Web UI or HDMI/touchscreen UI; physical buttons later |
| First scope | Playback, manifest parsing, FLAC decoding, local caching, and verification |
| Second major device | OAC Writer Dock Alpha for erase/burn/verify workflow |

# 2. Product-Family Principles

- Use Raspberry Pi hardware as a reference platform, not as a permanent requirement. OAC should remain implementable on other SBCs and future custom boards.

- Keep the OAC format open. The business can sell hardware, kits, tools, services, and certified parts, but the disc layout, manifest, libraries, and basic playback path should remain public.

- Separate format risk from mechanical risk. Bare 8cm DVD-RW playback must work before the cartridge-native drive is attempted.

- Reuse existing optical-drive hardware at first. Do not design a custom optical transport until the software, user ritual, and content model are already proven.

- Make every build reproducible. Each tier should publish BOMs, wiring diagrams, setup scripts, CAD files, OS images or installer scripts, and test procedures.

- Prioritize album experience over file browsing. The device should show artist, album, track order, cover art, duration, and playback state from the OAC manifest, not expose a generic folder tree.

- Cache aggressively. Optical drives are noisy, power-hungry, and sensitive to movement. The device should use the disc as the authoritative album object, then cache tracks locally during playback.

# 3. Recommended First Build

## 3.1 Device Name

OAC Pi Player Alpha

## 3.2 Board Selection

**Use Raspberry Pi 5 8GB first.** Raspberry Pi 5 provides the practical headroom needed for USB optical I/O, FLAC playback, album caching, local UI experiments, network control, and development/debugging. Raspberry Pi's official product materials list two USB 3.0 ports, two USB 2.0 ports, Gigabit Ethernet, PCIe 2.0 x1, USB-C power, RTC support, a power button, and a 40-pin GPIO header. This makes it a low-friction starting point for a dedicated OAC playback device.

| **Variant** | **Use first?** | **Reason** |
|----|----|----|
| Raspberry Pi 5 8GB | Yes | Best first reference target: enough I/O, memory, CPU, USB, networking, and community support. |
| Raspberry Pi 5 4GB | Later / acceptable | Probably sufficient for appliance playback, but less convenient for development and GUI experiments. |
| Raspberry Pi Zero 2 W | No | Attractive for small portable devices, but RAM, USB, power, and debugging constraints are premature. |
| Raspberry Pi Compute Module 5 | No, but important later | Best for embedded products and custom carrier boards after the software/media loop is proven. |

## 3.3 Initial Build Objective

- Insert an OAC Bare Disc Alpha 8cm DVD-RW into a USB DVD drive.

- Auto-detect the disc and mount it.

- Read OAC-MANIFEST.json.

- Display artist, album, and track list.

- Play FLAC tracks in manifest order.

- Cache the current track or full album locally.

- Optionally verify checksums.

- Expose a basic web UI or local display UI.

# 4. Product Family Overview

| **Tier** | **Device** | **Purpose** | **Primary Board** | **Status** |
|----|----|----|----|----|
| Tier 0 | OAC Software Player | No-hardware baseline for computers with optical drives. | User's computer | Immediate |
| Tier 1 | OAC Pi Player Alpha | First dedicated playback device using bare 8cm DVD-RW media. | Raspberry Pi 5 8GB | Build first |
| Tier 2 | OAC Writer Dock Alpha | Dedicated network/USB writer that erases, burns, verifies, and ejects OAC discs. | Raspberry Pi 5 8GB | Build second |
| Tier 3 | OAC Deck | Home-audio component with internal optical drive and better DAC/output options. | Pi 5 or CM5 | Product prototype |
| Tier 4 | OAC Portable Dev Kit | Portable player prototype with battery, display, controls, cache-first playback. | Pi 5 first / Zero 2 W or other SBC later | Research prototype |
| Tier 5 | OAC Cartridge Reader Dev Platform | Mechanical/electrical research platform for spinning disc inside cartridge. | CM5 + custom carrier | Long-term R&D |

The family should be published as buildable open hardware. Each tier should be useful on its own, but the strategic sequence is Player Alpha -\> Writer Dock -\> Deck -\> Portable -\> Cartridge-native Dev Platform.

# 5. Shared Hardware Architecture

Every Raspberry Pi OAC device should be a different packaging of the same basic subsystems.

| **Subsystem** | **Baseline** | **Upgrade Path** |
|----|----|----|
| Compute | Raspberry Pi 5 8GB | CM5 with custom carrier for embedded products. |
| Optical media | External USB tray-loading DVD-RW drive | Internal slim slot/tray drive, then cartridge-native mechanism. |
| Storage | microSD boot + optional USB SSD | NVMe via PCIe/M.2 HAT, eMMC on CM5. |
| Audio | USB DAC or HDMI audio | I2S DAC HAT, DAC Pro-style RCA output, headphone amplifier, digital out. |
| Display | HDMI display or small touchscreen | OLED/front-panel display for deck/portable. |
| Controls | Keyboard/web UI | GPIO buttons, rotary encoder, IR remote, transport buttons. |
| Network | Ethernet/Wi-Fi | Device API, OTA updates, OAC Studio control. |
| Power | Official Pi 5 USB-C supply | Integrated PSU, battery system, powered USB hub, charging board. |
| Enclosure | Open bench build | 3D-printed shell, laser-cut panels, component-style chassis. |

## 5.1 Optical Drive Requirements

- Use a tray-loading drive first. Slot-loading drives are risky for 8cm media and should be avoided until tested thoroughly.

- Confirm 8cm DVD-RW read support before publishing a drive as known-good.

- For writer devices, confirm DVD-RW erase/rewrite support, not just DVD-R read support.

- Prefer drives that can be externally powered or used through a powered USB hub. Optical drives can draw more current than the Pi's USB ports can reliably provide in all operating states.

- Document drive firmware quirks, disc recognition times, failed media brands, and reliable burn speeds.

## 5.2 Audio Output Strategy

**Start simple with a USB DAC.** A USB DAC avoids early GPIO/I2S configuration risk and keeps the first build reproducible. Later home-deck variants should use a quality DAC HAT or custom DAC board. Raspberry Pi's official audio documentation identifies the DAC Pro HAT as a high-fidelity DAC option with PCM5242, RCA line-level output, and headphone amplification, which makes it a useful reference point for the OAC Deck direction.

# 6. Shared Software Stack

> oac-device-os/\
> oac-agent\
> oac-mounter\
> oac-inspector\
> oac-verifier\
> oac-cache\
> oac-player\
> oac-device-api\
> oac-web-ui\
> oac-updater

| **Service** | **Responsibility** |
|----|----|
| oac-agent | Supervises the device, reports health, coordinates services. |
| oac-mounter | Detects optical media insertion/removal and mounts the disc read-only when appropriate. |
| oac-inspector | Reads OAC-MANIFEST.json and validates the disc's high-level identity. |
| oac-verifier | Calculates SHA-256 checksums and verifies the package against the manifest/checksum file. |
| oac-cache | Copies current track, next track, or full album to local storage for stable playback. |
| oac-player | Plays FLAC tracks in manifest order, supports play/pause/next/previous and gapless strategy. |
| oac-device-api | Provides local HTTP/WebSocket or gRPC API for OAC Studio, web UI, and device clients. |
| oac-web-ui | Browser-based setup, playback, library, verification, and writer controls. |
| oac-updater | Applies software updates and device image revisions. |

## 6.1 Playback State Machine

> IDLE\
> -\> DISC_INSERTED\
> -\> MOUNTING\
> -\> INSPECTING_MANIFEST\
> -\> READY\
> -\> CACHING\
> -\> PLAYING\
> -\> PAUSED\
> -\> EJECT_REQUESTED\
> -\> UNMOUNTING\
> -\> IDLE

## 6.2 Writer Dock State Machine

> IDLE\
> -\> RECEIVING_PACKAGE\
> -\> VALIDATING_PACKAGE\
> -\> WAITING_FOR_DVD_RW\
> -\> BLANKING_DISC\
> -\> BURNING_IMAGE\
> -\> VERIFYING_DISC\
> -\> WRITING_LOCAL_HISTORY\
> -\> EJECTING\
> -\> COMPLETE

# 7. Device Tier Specifications

## Tier 0: OAC Software Player

Prove the OAC disc layout and playback model on ordinary computers before custom hardware exists.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th><strong>Area</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Hardware</td>
<td>- Windows/Mac/Linux computer<br />
- External tray-loading DVD drive supporting 8cm media<br />
- OAC Bare Disc Alpha 8cm DVD-RW</td>
</tr>
<tr>
<td>Core features</td>
<td>- Disc detection<br />
- Manifest parsing<br />
- Checksum verification<br />
- FLAC playback<br />
- Debug-friendly inspection output</td>
</tr>
<tr>
<td>Open-source deliverables</td>
<td>- oac-player-desktop<br />
- sample-oac-disc<br />
- install instructions<br />
- format validation examples</td>
</tr>
<tr>
<td>Exit criteria</td>
<td>A user can insert a bare OAC disc into a standard computer drive and play it through OAC Player without manually browsing files.</td>
</tr>
</tbody>
</table>

## Tier 1: OAC Pi Player Alpha

First dedicated playback hardware using Raspberry Pi 5 and a USB optical drive.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th><strong>Area</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Hardware</td>
<td>- Raspberry Pi 5 8GB<br />
- Official Pi 5 power supply<br />
- External USB tray-loading DVD-RW drive<br />
- USB DAC or audio HAT<br />
- HDMI display or touchscreen<br />
- microSD or SSD boot</td>
</tr>
<tr>
<td>Core features</td>
<td>- Auto-mount inserted OAC disc<br />
- Read OAC manifest<br />
- Display album/track info<br />
- Play FLAC<br />
- Cache track or album<br />
- Optional verification<br />
- Web UI</td>
</tr>
<tr>
<td>Open-source deliverables</td>
<td>- BOM<br />
- assembly guide<br />
- install script<br />
- systemd services<br />
- web UI<br />
- known-good drive list<br />
- 3D-printable enclosure files</td>
</tr>
<tr>
<td>Exit criteria</td>
<td>A disc burned with OAC Studio plays reliably from the dedicated Pi device, with album metadata shown from the manifest.</td>
</tr>
</tbody>
</table>

## Tier 2: OAC Writer Dock Alpha

Make OAC writing feel like NetMD: send an album from OAC Studio to a dedicated device that erases, burns, verifies, and ejects.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th><strong>Area</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Hardware</td>
<td>- Raspberry Pi 5 8GB<br />
- USB DVD-RW writer<br />
- Powered USB hub if required<br />
- Local SSD or large microSD for temporary images<br />
- Small display/status LEDs optional</td>
</tr>
<tr>
<td>Core features</td>
<td>- Network device API<br />
- Receive album package/ISO<br />
- Blank DVD-RW<br />
- Burn image<br />
- Verify checksums<br />
- Eject<br />
- Report progress to OAC Studio</td>
</tr>
<tr>
<td>Open-source deliverables</td>
<td>- device-agent<br />
- burn-service<br />
- API documentation<br />
- OAC Studio connection flow<br />
- test scripts<br />
- troubleshooting guide</td>
</tr>
<tr>
<td>Exit criteria</td>
<td>A user can press Write in OAC Studio and have the dock produce a verified OAC DVD-RW without launching generic burning software.</td>
</tr>
</tbody>
</table>

## Tier 3: OAC Deck

Component-style home audio player that makes OAC feel like serious physical media rather than a lab prototype.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th><strong>Area</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Hardware</td>
<td>- Raspberry Pi 5 or Compute Module 5<br />
- Internal slim DVD-RW drive<br />
- High-quality DAC<br />
- RCA line out<br />
- Optional headphone amp<br />
- Front-panel display<br />
- Transport controls<br />
- Component enclosure</td>
</tr>
<tr>
<td>Core features</td>
<td>- Fast disc recognition<br />
- Quiet playback via caching<br />
- Album display<br />
- Line-out audio<br />
- Remote/web control<br />
- Optional writer mode</td>
</tr>
<tr>
<td>Open-source deliverables</td>
<td>- CAD enclosure<br />
- front-panel UI<br />
- DAC configuration<br />
- BOM<br />
- assembly guide<br />
- audio validation notes</td>
</tr>
<tr>
<td>Exit criteria</td>
<td>The device can sit in a home audio stack and play OAC discs with a finished, appliance-like experience.</td>
</tr>
</tbody>
</table>

## Tier 4: OAC Portable Dev Kit

Explore a portable personal player inspired by MiniDisc, Discman, and PSP-style hardware.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th><strong>Area</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Hardware</td>
<td>- Raspberry Pi 5 for first large prototype<br />
- Later: Zero 2 W or non-Pi SBC if appropriate<br />
- Slim optical drive<br />
- Battery pack<br />
- Charging board<br />
- Small display<br />
- Buttons<br />
- Headphone DAC/amp<br />
- Local cache storage</td>
</tr>
<tr>
<td>Core features</td>
<td>- Battery-aware caching<br />
- Disc spin-down during playback<br />
- Headphone output<br />
- Pocket/handheld UI<br />
- Resume playback<br />
- Lock controls</td>
</tr>
<tr>
<td>Open-source deliverables</td>
<td>- power budget<br />
- battery safety notes<br />
- cache service<br />
- button map<br />
- portable enclosure CAD<br />
- runtime benchmarks</td>
</tr>
<tr>
<td>Exit criteria</td>
<td>The prototype can play an OAC album away from wall power with acceptable runtime and stable cache-first playback.</td>
</tr>
</tbody>
</table>

## Tier 5: OAC Cartridge Reader Dev Platform

Research the final cartridge-native mechanism where the 8cm DVD-RW spins inside the OAC cartridge.

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th><strong>Area</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Hardware</td>
<td>- Compute Module 5<br />
- Custom carrier board<br />
- Adapted optical drive mechanism<br />
- Cartridge slot<br />
- Shutter actuator<br />
- Clamp/spindle access<br />
- Insertion sensors<br />
- Transparent test cartridge</td>
</tr>
<tr>
<td>Core features</td>
<td>- Cartridge insertion/ejection<br />
- Shutter open/close<br />
- Disc clamp sensing<br />
- Spin-clearance validation<br />
- Optical pickup access<br />
- Safety interlocks</td>
</tr>
<tr>
<td>Open-source deliverables</td>
<td>- cartridge CAD<br />
- reader CAD<br />
- tolerance study<br />
- sensor board<br />
- firmware<br />
- test procedure<br />
- failure-mode report</td>
</tr>
<tr>
<td>Exit criteria</td>
<td>The system can clamp and read an 8cm DVD-RW while the disc remains inside a serviceable cartridge shell.</td>
</tr>
</tbody>
</table>

# 8. Build and Publishing Model

## 8.1 What Every Hardware Tier Must Publish

- Bill of materials with known-good and tested alternatives.

- Assembly guide with photos or diagrams.

- Wiring guide, including GPIO pinout if used.

- Install script or full OS image build recipe.

- Source code for device services and UI.

- Systemd service files and configuration defaults.

- 3D-printable or laser-cut enclosure files where applicable.

- Test plan and expected outputs.

- Troubleshooting guide with failure symptoms.

- Safety notes for optical drive power, batteries, and enclosures.

- Known-good hardware list and known-bad hardware list.

## 8.2 Proposed Repository Layout

> open-album-cartridge/\
> specs/\
> OAC_FORMAT_SPEC.md\
> OAC_MANIFEST_SCHEMA.json\
> OAC_DISC_LAYOUT.md\
> software/\
> oac-studio/\
> oac-device-os/\
> oac-player/\
> oac-writer/\
> hardware/\
> oac-pi-player-alpha/\
> oac-writer-dock-alpha/\
> oac-deck/\
> oac-portable-dev-kit/\
> oac-cartridge-reader-dev-platform/\
> media/\
> sample-oac-disc/\
> test-albums/\
> docs/\
> getting-started.md\
> build-matrix.md\
> troubleshooting.md\
> hardware-compatibility.md

## 8.3 Public Documentation Style

- Use plain build guides rather than marketing copy. The early audience is makers, collectors, and open-hardware contributors.

- Document failure modes honestly. Optical drives, 8cm media, and DVD-RW rewriting will have quirks.

- Keep the first build cheap and testable. Do not require custom PCBs for the initial Pi Player Alpha.

- Use semantic versioning for software and document versions for hardware builds.

- Publish conformance media and expected logs so community members can verify their builds.

# 9. Roadmap and Milestones

| **Phase** | **Milestone** | **Target Outcome** |
|----|----|----|
| Phase A | Bare Disc Alpha | OAC 8cm DVD-RW discs can be created with FLAC, manifest, cover art, and checksums. |
| Phase B | OAC Software Player | A computer can detect and play OAC discs through a dedicated app. |
| Phase C | OAC Pi Player Alpha | Dedicated Raspberry Pi device plays OAC discs reliably. |
| Phase D | OAC Writer Dock Alpha | Dedicated Pi device erases/burns/verifies OAC discs from OAC Studio. |
| Phase E | OAC Deck Prototype | Home audio appliance form factor proves finished product experience. |
| Phase F | OAC Portable Dev Kit | Battery-powered cache-first playback proves personal-listening viability. |
| Phase G | OAC Cartridge Reader Dev Platform | Mechanism research proves cartridge-native optical reading. |

## 9.1 First 30 Build Tasks

1.  Acquire Raspberry Pi 5 8GB and official power supply.

2.  Acquire at least one tray-loading USB DVD-RW drive and a powered USB hub.

3.  Acquire 8cm DVD-RW test media and 8cm DVD-R media for comparison.

4.  Burn three OAC Bare Disc Alpha examples using OAC Studio or manual folder layout.

5.  Install Raspberry Pi OS Lite or Desktop depending on UI approach.

6.  Verify the USB DVD drive is detected under Linux.

7.  Verify 8cm DVD-RW discs mount correctly.

8.  Create a minimal oac-mounter service.

9.  Create oac-inspector to read OAC-MANIFEST.json.

10. Create oac-player CLI that plays manifest tracks in order.

11. Test FLAC playback through HDMI audio.

12. Test FLAC playback through USB DAC.

13. Add basic cache-to-local-storage behavior.

14. Add web UI endpoint for current album and track list.

15. Add play/pause/next/previous API commands.

16. Add checksum verification command.

17. Create basic systemd services.

18. Create install.sh.

19. Create log collection command for troubleshooting.

20. Create known-good-drive test notes.

21. Create BOM draft.

22. Create bench-build wiring/connection guide.

23. Create simple enclosure concept.

24. Publish sample disc fixture.

25. Publish getting-started guide.

26. Run repeat insert/eject testing.

27. Run cache playback test with drive spun down if feasible.

28. Document any DVD-RW media failures.

29. Tag alpha release.

30. Record demo video/script for public documentation.

# 10. Risks, Unknowns, and Design Rules

| **Risk** | **Impact** | **Mitigation** |
|----|----|----|
| USB optical drive power draw | Drive may disconnect, fail to spin up, or fail during burn. | Use official Pi power supply, powered USB hub, and known-good drive list. |
| 8cm DVD-RW compatibility | Some drives may reject, misread, or poorly burn mini DVD-RW media. | Test specific drive/media combinations and publish compatibility matrix. |
| Optical drive noise | Playback may feel cheap or distracting. | Cache tracks or full album, then spin down drive during playback. |
| DVD-RW rewrite reliability | Discs may fail after repeated erase/write cycles or with poor media. | Verify every burn and log media brand/rewrite count. |
| Portable power budget | Battery runtime may be poor with optical drive active. | Use cache-first playback and spin down the drive quickly. |
| Cartridge-native mechanism complexity | Mechanical development could dominate the project. | Delay until bare-disc player and writer workflows are proven. |
| Software scope creep | Building a polished app too early can delay format validation. | Prioritize CLI/device service and simple UI first. |

## 10.1 Non-Negotiable Design Rules

- Never make the cartridge-native mechanism a dependency for early adoption.

- Never require proprietary software to read an OAC disc.

- Never hide the manifest or file layout from users.

- Always support ordinary computer inspection of bare OAC discs.

- Always verify writes and make verification status visible to the user.

- Always keep the disc object and album object aligned: one disc should represent one album package unless explicitly marked as a compilation/mix.

- Always separate free/open core functionality from any future paid convenience tools.

# 11. Appendix

## 11.1 Suggested Initial BOM: OAC Pi Player Alpha

| **Part** | **Recommended baseline** | **Notes** |
|----|----|----|
| Single-board computer | Raspberry Pi 5 8GB | Official first reference target. |
| Power supply | Official Raspberry Pi 5 USB-C power supply | Avoid under-voltage while testing optical drives. |
| Optical drive | Tray-loading USB DVD-RW drive | Must support 8cm media; publish exact tested models. |
| USB power | Powered USB hub | Recommended for optical-drive reliability. |
| Storage | microSD card, later USB SSD or NVMe | SSD helps with caching and development. |
| Audio | USB DAC | Lowest-friction first audio path. |
| Display | HDMI screen or official touchscreen | Web UI can be the first UI if display is deferred. |
| Controls | Keyboard/mouse or web UI | GPIO buttons later. |
| Media | 8cm DVD-RW discs | Use multiple brands if possible for compatibility testing. |
| Enclosure | Bench setup first | Do not block software progress on enclosure design. |

## 11.2 Device API Sketch

> GET /api/device/status\
> GET /api/disc/current\
> POST /api/disc/verify\
> GET /api/player/state\
> POST /api/player/play\
> POST /api/player/pause\
> POST /api/player/next\
> POST /api/player/previous\
> POST /api/cache/full-album\
> POST /api/eject

## 11.3 Test Plan: OAC Pi Player Alpha

| **Test** | **Expected Result** |
|----|----|
| Boot device with no disc | Device enters idle state and web/local UI reports no disc. |
| Insert valid OAC disc | Disc mounts; manifest is read; album metadata appears. |
| Insert non-OAC DVD | Device reports unsupported disc rather than crashing. |
| Play album | Tracks play in manifest order. |
| Checksum verify | Verification completes with pass/fail status. |
| Eject during idle | Disc unmounts cleanly and ejects. |
| Eject during playback | Playback stops cleanly; disc unmounts or prompts user. |
| Cache full album | Files copy to local cache and playback continues from cache. |
| Network control | Web UI/API can control playback. |
| Repeat insertion 20 times | No stale mount state or service crash. |

## 11.4 Glossary

| **Term** | **Meaning** |
|----|----|
| OAC | Open Album Cartridge. |
| OAC Bare Disc Alpha | Prototype OAC disc using bare 8cm DVD-RW media before cartridge hardware exists. |
| OAC-FLAC Data Mode | OAC storage profile using FLAC files, manifest, artwork, and checksums on optical media. |
| OAC Studio | Software used to package, burn, label, verify, and later write to OAC devices. |
| OAC Device OS | Shared Raspberry Pi device software stack for playback, verification, caching, and device API. |
| Manifest | JSON file that describes album, tracks, file paths, checksums, and format version. |
| Cache-first playback | Playback model where audio is copied from optical media to local storage before or during playback to reduce drive spinning. |

## 11.5 Sources

| **Source** | **Used for** | **URL** |
|----|----|----|
| Raspberry Pi 5 product page | Raspberry Pi 5 provides two USB 3.0 ports, two USB 2.0 ports, Gigabit Ethernet, PCIe 2.0 x1, USB-C power, RTC, and a power button. | https://www.raspberrypi.com/products/raspberry-pi-5/ |
| Raspberry Pi 5 product brief | Official product brief confirms USB, Ethernet, PCIe, USB-C PD, RTC, and operating envelope details. | https://pip.raspberrypi.com/documents/RP-008348-DS-raspberry-pi-5-product-brief.pdf |
| Raspberry Pi Compute Module 5 product page | Compute Module 5 provides a Pi 5-class module with SDRAM and eMMC options for embedded/custom carrier-board designs. | https://www.raspberrypi.com/products/compute-module-5/ |
| Raspberry Pi Compute Module documentation | Compute Modules contain core Raspberry Pi components without the standard connectors and are intended for embedded/industrial designs. | https://www.raspberrypi.com/documentation/computers/compute-module.html |
| Raspberry Pi Zero 2 W product page | Zero 2 W uses a 1GHz quad-core 64-bit Arm Cortex-A53 CPU, 512MB SDRAM, wireless LAN, and a 65mm x 30mm form factor. | https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/ |
| Raspberry Pi audio documentation | Raspberry Pi DAC Pro HAT uses the PCM5242 DAC, provides RCA line output, and includes a headphone amplifier. | https://www.raspberrypi.com/documentation/accessories/audio.html |

## 11.6 Open Questions

- Which USB DVD-RW drive should become the first official known-good reference drive?

- Should OAC Pi Player Alpha require local display hardware, or should the web UI be sufficient for the first public build?

- Should the first deck prioritize RCA line-out, headphone out, or digital out?

- Should Writer Dock Alpha use network-only mode first, with USB device mode later?

- What is the minimum acceptable time from disc insertion to album-ready state?

- What is the target cache behavior: current track, next track, or full album by default?

- How much of the OAC device stack should be Python initially versus TypeScript/Rust later?
