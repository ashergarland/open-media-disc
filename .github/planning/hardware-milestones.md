# Hardware milestones (parked)

The Open Media Disc hardware program, preserved in full so nothing is lost while
the project focuses on the software ecosystem. **None of this is scheduled.**
Pick it back up by moving a milestone from here into
[`./ROADMAP.md`](./ROADMAP.md) and writing its prompt chain in
[`../prompts/hardware/`](../prompts/hardware/README.md).

The guiding rule has not changed: **the cartridge is the format; the DVD-RW is
the storage layer.** Hardware only becomes worth building once the format, the
media loop, and the software ecosystem around them are proven.

## Why parked, not cancelled

- Hardware work cannot be verified by an agent. It gates on the user being at a
  bench with a drive, a disc, and a soldering iron.
- Every hardware milestone consumes the format and the SDK. Every improvement we
  make to the software ecosystem makes the hardware cheaper to build later.
- Adoption is a software problem first. A format becomes dominant because people
  can use it everywhere, not because a dock exists.

## The parked milestones

| ID | Milestone | Goal | Prior status |
| --- | --- | --- | --- |
| HW-1 | **Studio hardware acceptance** | Guided manual burn-and-play acceptance of OMD Studio on a real Windows machine with a real writable disc. | Was next; prompt preserved at [`hardware-01-studio-burn-and-play-acceptance`](../prompts/hardware/hardware-01-studio-burn-and-play-acceptance.prompt.md) |
| HW-2 | **Writer Dock** | A dedicated device that erases, burns, verifies, and ejects an 8cm DVD-RW with no PC in the loop. | Planned |
| HW-3 | **Pi Player** | A Raspberry Pi playback device that reads bare OMD discs, running the same touch-first Studio UI in kiosk mode. | Planned |
| HW-4 | **OMD Deck** | A component-style home-audio player: a real hi-fi separate with a front-loading slot. | Research |
| HW-5 | **Portable player** | A battery-powered, cache-first, MiniDisc-style handheld. | Research |
| HW-6 | **Cartridge-native** | Spin an 8cm DVD-RW inside a serviceable cartridge shell: the actual physical format. | Long-term R&D |

## HW-1: Studio hardware acceptance

The one piece of hardware work that is genuinely close. It is the final
acceptance pass for the delivered OMD Studio redesign: burn a real disc, verify
it, eject, reinsert, play it back, and rip it to the catalog. The prompt is
written and ready; it only needs the user at a machine with a writer and a
DVD-RW.

Run it whenever a disc and a spare hour line up. It does not need to wait for the
rest of the hardware program.

## HW-2: Writer Dock

A standalone appliance that takes a package (over USB, network, or from an SD
card) and writes it to an 8cm DVD-RW: erase, burn, verify, eject. No PC needed.
Depends on a non-Windows burn backend in `@open-media-disc/core` (the
`BurnBackend` seam already exists; Linux `growisofs`/`xorriso` is the natural
first target).

## HW-3: Pi Player

A Raspberry Pi with a 7-10 inch touch panel and a slim optical drive that plays
bare OMD discs. Most of this already exists: OMD Studio is kiosk-capable and
tuned for small screens. What is missing is the device build, the boot-to-app
image, automount and disc-detection on Linux, and audio output configuration.

## HW-4: OMD Deck

A component-style home-audio player sized like a hi-fi separate: front slot,
display, physical transport controls, line out. Shares the Pi Player's software
stack but with a different chassis, a real DAC, and an IR remote.

## HW-5: Portable player

Battery-powered handheld in the spirit of a MiniDisc player. Cache-first: read
the album to internal flash, then spin down the drive so playback is silent and
shock-proof. The hardest software problem here is power management, not audio.

## HW-6: Cartridge-native

The end state, and the reason the project exists: an 8cm DVD-RW inside a
serviceable cartridge shell, spun and read without ever exposing the disc. This
is real mechanical engineering (shutter, hub, spindle access, tolerances) and it
only makes sense once the format is worth protecting.

## What the software program should leave ready for hardware

Keep these in mind while doing software work, because they are cheap now and
expensive later:

- **Cross-platform burn backends.** The Windows IMAPI2 backend works; Linux is
  the gate for every device milestone.
- **Linux disc detection and mounting** in the core, not just in Studio.
- **A small, embeddable player surface.** The shared `@open-media-disc/ui`
  package should stay lean enough to run on a Pi.
- **Kiosk and appliance modes** in Studio, already started, kept working.
- **A stable, versioned format.** Any hardware built against `omdVersion` 0.1.0
  must keep reading discs made years later.
