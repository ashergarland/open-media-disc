# Ideas: integrations and interop

Prefix `INT`. Meeting people where their music already lives.

This category serves objective **O3**. The premise: nobody is going to reorganize
their music library to try a new format. Every integration here removes a reason
to say no, and most of them are small compared to their effect on adoption.

Hard boundary, from the project's scope rules: reading metadata **from** a
service to enrich a package is fine. Playing music **from** a service is not what
OMD is, and no idea in this catalog should cross that line.

## INT-1 MusicBrainz and Discogs metadata lookup

**Pitch.** During import, look up the album by disc contents or by artist and
title, and offer to fill in track titles, year, credits, and identifiers, with
the user confirming before anything is written.

**Why.** Typing metadata is by far the most tedious part of packaging an album,
and it is the reason a user stops after three albums. Both services are designed
for exactly this and MusicBrainz is explicitly open.

**Value** high · **Effort** medium · **Serves** O2, O3 · **Depends on** none ·
**Status** open

**Risks.** Network calls from a previously offline-only tool: needs rate limiting,
a user agent, caching, and a clear opt-in. Discogs requires authentication and
has stricter terms than MusicBrainz, so MusicBrainz should come first.

## INT-2 Cover Art Archive fetching

**Pitch.** Fetch front cover art from the Cover Art Archive for an identified
release, at a resolution suitable for both the player and the printed label.

**Why.** Missing artwork is the most visible flaw in a packaged album, and it is
the one thing that makes the physical object look unfinished.

**Value** medium · **Effort** low · **Serves** O2, O6 · **Depends on** INT-1 ·
**Status** open

**Risks.** Art licensing varies. Fetching for personal use of an owned album is
normal practice, but the tool should never redistribute art, and the user should
always confirm.

## INT-3 Import from existing library managers

**Pitch.** Read library exports and folder conventions from the tools people
already use: iTunes and Music XML, Plex and Jellyfin folder layouts, foobar2000
and MusicBee playlists.

**Why.** Every one of these represents an existing, curated, tagged collection.
Importing from them means a user's first OMD experience uses their own music with
correct metadata, rather than a folder they had to assemble by hand.

**Value** high · **Effort** medium · **Serves** O2, O3 · **Depends on** SDK-7 ·
**Status** open

**Risks.** Long tail of formats and conventions. Pick two, do them properly, and
make the import path pluggable rather than trying to cover everything.

## INT-4 Export for media servers

**Pitch.** Export a package as a media-server-friendly album folder with restored
tags and optional NFO sidecars, so a ripped disc drops straight into Jellyfin or
Plex.

**Why.** It closes the loop: disc to library, not just library to disc. It also
answers the lock-in objection concretely, which matters more to the audience that
would otherwise be most skeptical.

**Value** medium · **Effort** medium · **Serves** O3, O5 · **Depends on** CLI-7,
SDK-7 · **Status** open

**Risks.** Writing tags into audio files means modifying user data. Copy, never
in place, and report every change.

## INT-5 Purchase folder importers

**Pitch.** Recognize the folder layouts of common purchased downloads (Bandcamp,
Qobuz, and similar) and pre-fill album metadata from what is already in them.

**Why.** Purchased downloads are the ideal OMD source: owned, lossless, already
tagged. Making that path one click connects the format directly to how people
legitimately acquire music.

**Value** medium · **Effort** low · **Serves** O2, O3 · **Depends on** SDK-7 ·
**Status** open

**Risks.** Layouts change without notice. Treat detection as a hint that
pre-fills a form the user confirms, never as an authority.

## INT-6 Cue sheet and single-file album splitting

**Pitch.** Accept a single-file album plus a cue sheet, split it into tracks at
the specified boundaries, and package the result.

**Why.** A large share of archived lossless albums, especially older rips and
live recordings, exist only in this shape. Without support they simply cannot
become OMD packages.

**Value** medium · **Effort** medium · **Serves** O3 · **Depends on** SDK-12 ·
**Status** open

**Risks.** Splitting is lossy in effort if not in quality, and cue sheet
encodings are inconsistent. Interacts directly with gapless (FMT-3), since
splitting is where gapless information is usually lost.

## INT-7 Playlist import for mixtapes

**Pitch.** Build a mixtape from an M3U, PLS, or XSPF playlist, resolving each
entry against the library and reporting what is missing.

**Why.** The mixtape is the most emotionally compelling use of a physical
rewritable disc, and everyone's mixtapes already exist as playlists somewhere.

**Value** medium · **Effort** low · **Serves** O2, O3 · **Depends on** none ·
**Status** open

**Risks.** Path resolution across machines is unreliable. Needs a good "could not
find these tracks" experience rather than a hard failure.

## INT-8 Capacity-aware transcode profiles

**Pitch.** Named profiles that transcode a source album to fit a chosen media
profile: keep lossless if it fits, otherwise offer a stated lossy target, always
showing the honest resulting codec facts.

**Why.** The most common packaging failure is an album that does not fit on an
8cm disc. Today that is a dead end; it should be an informed choice, presented
without dishonest language about what the result is.

**Value** high · **Effort** medium · **Serves** O2, O6 · **Depends on** SDK-12,
FMT-10 · **Status** open

**Risks.** This is precisely where "lossless" language goes wrong. The UI and the
manifest must both describe the actual result: a FLAC transcoded from a lossy
source is not lossless audio, and the tooling must never imply otherwise.

## INT-9 Scrobbling

**Pitch.** Optional ListenBrainz or Last.fm scrobbling from Studio playback.

**Why.** People who track their listening want their physical listening counted,
and a disc that scrobbles is a disc that participates in their existing habits
instead of interrupting them.

**Value** low · **Effort** low · **Serves** O3 · **Depends on** none ·
**Status** open

**Risks.** Credentials in a desktop app, plus a network feature in a tool that is
otherwise entirely offline. Strictly opt-in, ListenBrainz first because it is
open.

## INT-10 Operating system media integration

**Pitch.** Report now playing to the OS: MPRIS on Linux, System Media Transport
Controls on Windows, and the equivalent on macOS, so hardware media keys, lock
screens, and overlays work.

**Why.** Media keys not working is the fastest way for an app to feel like a toy.
MPRIS in particular is what would make a Pi player behave like a real appliance
in a Linux desktop or home setup.

**Value** medium · **Effort** medium · **Serves** O3, O6 · **Depends on** none ·
**Status** open

**Risks.** Three platform APIs, each with its own Electron integration story and
edge cases.

## INT-11 Home automation integration

**Pitch.** Expose the player to home automation (Home Assistant and similar) so a
disc player can appear as a media entity in a smart home.

**Why.** It positions an OMD player as a component of a home audio setup rather
than a novelty, and it is the natural companion to the parked Pi player and deck
hardware.

**Value** low · **Effort** medium · **Serves** O3 · **Depends on** APP-5 ·
**Status** open

**Risks.** Only meaningful once a headless server or a device exists. Premature
before then.

## INT-12 Beets plugin

**Pitch.** A plugin for beets, the command-line library manager, that exports an
album as an OMD package directly from a beets query.

**Why.** Beets users are the exact intersection of people who care about metadata
quality, own their music, and script their library. They are the most likely
early adopters of a format like this, and they arrive with clean data.

**Value** medium · **Effort** medium · **Serves** O3 · **Depends on** CLI-2 ·
**Status** open

**Risks.** Beets is Python, so the plugin either shells out to the CLI (which is
why CLI-2 matters) or waits for a Python SDK. Shelling out is the pragmatic
answer.

## INT-13 Machine-readable disc identity on labels

**Pitch.** Print a QR or data matrix code on the label encoding the disc id and
core metadata, so scanning a disc identifies it without inserting it.

**Why.** With a shelf of discs, finding the right one is the actual daily
problem. A scannable label is how a physical collection gets an index, and it
works with any phone.

**Value** low · **Effort** low · **Serves** O6 · **Depends on** STU-13 ·
**Status** open

**Risks.** The code must encode identity and metadata only, never a URL to a
service that might not exist later. That constraint keeps it consistent with the
recoverability commitment.
