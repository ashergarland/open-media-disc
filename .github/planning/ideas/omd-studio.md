# Ideas: OMD Studio

Prefix `STU`. Changes to [`@open-media-disc/studio`](../../../packages/studio),
the Electron desktop and Raspberry Pi touch app.

Studio shipped as `studio-v0.2.0` after the touch-first redesign: hub-and-spoke
navigation, seven screens (home, disc, catalog, create a disc, labels, themes,
settings), a persistent transport dock, the `--omd-*` token contract, and three
token-map themes.

Constraints that apply to every idea here: strict CSP (no inline styles, CSSOM
only), themes are token maps that never change layout, 44px minimum touch
targets, and the same UI has to work on a desktop window and a 7 to 10 inch Pi
panel.

## STU-1 Real catalog search and filtering

**Pitch.** Grow the hub search into proper catalog search: filter by artist,
album, year, codec, and duration, with sorting and a persistent view state.

**Why.** The catalog is currently a scanned folder presented as a list. Past
about fifty albums it stops being usable, which caps how much of a real library
anyone will put into OMD.

**Value** high · **Effort** medium · **Serves** O2 · **Depends on** none ·
**Status** open

**Risks.** Scanning a large folder on every launch will not scale. This probably
forces the local index that the alpha deliberately deferred.

## STU-2 Burn queue and job history

**Pitch.** Queue multiple burn jobs, run them one disc at a time with prompts to
swap media, and keep a history of what was burned, when, and whether it verified.

**Why.** Anyone converting a collection burns discs in batches, and the current
one-at-a-time flow makes that an evening of babysitting. History also answers
"did this disc verify?" months later.

**Value** medium · **Effort** medium · **Serves** O2 · **Depends on** SDK-4,
SDK-6 · **Status** open

**Risks.** Requires reliable eject and insert detection, which is exactly the
part that is platform-specific and least tested.

## STU-3 Artwork tools

**Pitch.** In-app artwork handling: fetch from a package, crop to square,
validate resolution, and slot art into the cover, back, disc face, and spine
positions.

**Why.** The physical object is the product. Bad artwork ruins a label sheet, and
today the only fix is an external image editor plus a file copy.

**Value** medium · **Effort** medium · **Serves** O6 · **Depends on** FMT-13 ·
**Status** open

**Risks.** Image editing scope creep. Crop, scale, and slot only; anything more
belongs in a real editor.

## STU-4 Smarter import with duplicate detection

**Pitch.** During import, detect albums already in the catalog, flag likely
duplicates, and offer to update rather than re-add.

**Why.** Importing a library repeatedly is normal, and every duplicate is a
wasted disc. This is the kind of small intelligence that makes an app feel like
it is paying attention.

**Value** medium · **Effort** medium · **Serves** O2 · **Depends on** STU-1 ·
**Status** open

**Risks.** Matching heuristics produce false positives. Must always be advisory,
never automatic.

## STU-5 First-run onboarding

**Pitch.** A guided first launch: pick a library folder, check the environment
(reusing CLI-1's checks), explain what OMD is in three screens, and offer to
package a first album.

**Why.** The app currently opens into a hub that assumes you know what OMD is.
The first five minutes decide whether anyone comes back, and right now they are
unguided.

**Value** high · **Effort** low · **Serves** O2, O6 · **Depends on** CLI-1 ·
**Status** open

**Risks.** Onboarding that cannot be skipped or re-run is worse than none.

## STU-6 Validation report viewer

**Pitch.** A dedicated view rendering a package's validation result: every code,
what it means, which file it concerns, and a fix action where one exists.

**Why.** Validation is the format's core promise and it is currently mostly
invisible in the GUI. Surfacing it well is also the most natural place to teach
users what the format actually guarantees.

**Value** medium · **Effort** medium · **Serves** O2, O5 · **Depends on** CLI-6,
SDK-8 · **Status** open

**Risks.** A wall of codes is intimidating. Needs strong grouping and a plain
summary line at the top.

## STU-7 Gapless and crossfade playback

**Pitch.** Make the transport play an album continuously: preload the next track,
honor gapless metadata, and offer an optional crossfade.

**Why.** OMD is an album format whose own player currently clicks between tracks.
Live albums and continuous mixes are unlistenable, which undercuts the whole
premise.

**Value** high · **Effort** medium · **Serves** O6 · **Depends on** FMT-3 ·
**Status** open

**Risks.** Gapless in an HTML5 audio element is awkward. May require Web Audio
scheduling, which changes how the analyser and the transport are wired.

## STU-8 User theme import and export

**Pitch.** Let a user export the current theme as a token JSON file, edit it, and
import it back, with validation against the `--omd-*` contract.

**Why.** Themes are already pure data. Making them shareable is nearly free and
turns theming into something the community does rather than something we ship.

**Value** medium · **Effort** low · **Serves** O6 · **Depends on** none ·
**Status** open

**Risks.** An imported theme must not be able to break layout or contrast. Needs
schema validation plus a contrast check (see A11Y-3), which is the real work.

## STU-9 More built-in themes

**Pitch.** Expand beyond midnight, daylight, and ember: a Y2K aero revival, a
warm hi-fi separates look, a high-contrast mode, and a low-power e-ink style
theme for the Pi.

**Why.** Themes are the cheapest way to make the app feel like a product, and
they are the most visible proof that the token contract works. The e-ink and
high-contrast entries also serve accessibility and battery life.

**Value** medium · **Effort** low · **Serves** O4, O6 · **Depends on** STU-8 ·
**Status** open

**Risks.** Every theme is a maintenance obligation whenever a token is added.

## STU-10 Portrait and phone-width layouts

**Pitch.** Finish the deferred layout work: portrait tablets and phone-width
windows, verified with the screenshot harness.

**Why.** The redesign targeted landscape and left portrait as tolerated rather
than designed. Portrait panels are common on wall-mounted and shelf devices,
which is a natural home for OMD.

**Value** medium · **Effort** medium · **Serves** O4 · **Depends on** none ·
**Status** open

**Risks.** Little, and the screenshot harness makes it verifiable without
hardware.

## STU-11 Installers and updates

**Pitch.** Real installers for Windows, macOS, and Linux, plus a signed
auto-update channel.

**Why.** "Clone the monorepo and run pnpm" is not a distribution strategy. This
is the single biggest barrier between the app existing and anyone using it.

**Value** high · **Effort** high · **Serves** O2, O4 · **Depends on** INF-1,
INF-2 · **Status** open

**Risks.** Code signing costs money and involves certificates and notarization on
two platforms. Auto-update is a security surface that has to be done properly or
not at all.

## STU-12 Diagnostics bundle

**Pitch.** A settings action that collects logs, the environment report, and the
last operation's details into a single file the user can attach to a bug report.
No telemetry, no network.

**Why.** Burn failures are hardware-specific and nearly impossible to debug from
a description. This is also the honest alternative to analytics for a project
that should not be collecting data.

**Value** medium · **Effort** low · **Serves** O4 · **Depends on** none ·
**Status** open

**Risks.** Must scrub paths and any personal information before writing the
bundle.

## STU-13 Better label printing

**Pitch.** Print presets for common label stock and sleeve sizes, a PDF export
with correct bleed and crop marks, and a preview that matches the printed result.

**Why.** The label is the moment the disc becomes an object. Getting print
fidelity right is the difference between a homemade disc and a release, which is
the stated point of the whole project.

**Value** medium · **Effort** medium · **Serves** O6 · **Depends on** FMT-13 ·
**Status** open

**Risks.** Printer and driver variation is notorious. PDF export is the reliable
path and direct printing should be treated as best effort.

## STU-14 Art-driven dynamic theming

**Pitch.** Derive accent tokens from the album cover so the player subtly takes
on each album's palette, within the theme's contrast constraints.

**Why.** It is the single most striking thing a music app can do visually, and
the token architecture already supports it: only variables change, never layout.

**Value** low · **Effort** medium · **Serves** O6 · **Depends on** A11Y-3 ·
**Status** open

**Risks.** Extracted colors routinely fail contrast requirements. It must be
clamped by the accessibility contract and be switchable off.

## STU-15 LAN remote control

**Pitch.** A small web page served by Studio on the local network that shows now
playing and offers transport control, aimed at a Pi player across the room.

**Why.** A shelf player with a 7 inch screen needs a remote, and a phone is the
remote everyone already owns. It also demonstrates the app as a device rather
than a desktop program.

**Value** medium · **Effort** medium · **Serves** O2, O6 · **Depends on** APP-5
· **Status** open

**Risks.** Opening a network listener in a desktop app is a security decision:
off by default, bound to the LAN, with a visible indicator when it is on.
