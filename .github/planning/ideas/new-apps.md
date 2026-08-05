# Ideas: new apps and surfaces

Prefix `APP`. New software surfaces that extend the OMD ecosystem beyond the CLI
and Studio.

The strategic logic: a format becomes dominant by appearing in more places than
its creators can maintain. Every surface here is a place where someone can
encounter OMD without having decided to adopt it first. Ranked roughly by how
cheaply they create that encounter.

Each of these is also a maintenance obligation, so this is the category where
"no" is most often the right answer. They are catalogued anyway, because the
reason for a no is worth keeping.

## APP-1 OMD web inspector

**Pitch.** A static web page where you drop a package folder or a manifest and
immediately get the full validation report, the track list, and the disc size
estimate. No install, no upload: everything runs locally in the browser.

**Why.** It is the cheapest possible "try OMD". It also doubles as living
documentation of the format and as a reference the spec can link to, and it makes
the validation rules tangible to someone evaluating whether to implement them.

**Value** high · **Effort** medium · **Serves** O1, O2 · **Depends on** SDK-11 ·
**Status** open

**Risks.** Requires the browser-safe SDK split first. Must be unmistakably local
only, since people will be dropping their music library into it.

## APP-2 Mobile companion

**Pitch.** A read-only phone app: browse the catalog, see what is on each disc,
and act as a remote for a Studio or Pi player on the same network.

**Why.** A physical collection needs a "what do I own?" answer away from the
shelf, and the phone is the remote everyone already has. It is also the most
natural way for someone else in the household to interact with an OMD player.

**Value** medium · **Effort** high · **Serves** O2, O6 · **Depends on** APP-5 ·
**Status** open

**Risks.** Native mobile is a whole new platform, toolchain, and store
relationship. A responsive web app served by APP-5 gets most of the value for a
fraction of the cost and should be evaluated first.

## APP-3 Editor extension

**Pitch.** A VS Code extension that previews `OMD-MANIFEST.json` as a formatted
album view, validates it live against the schema, and offers quick fixes.

**Why.** It puts OMD in front of developers in the place they spend their day,
which is exactly the audience that would implement the format elsewhere. It is
also a genuinely small project on top of the existing schema.

**Value** medium · **Effort** low · **Serves** O1 · **Depends on** SDK-11 ·
**Status** open

**Risks.** Marketplace publishing and a modest ongoing maintenance cost.

## APP-4 File manager integration

**Pitch.** A shell extension so an inserted OMD disc or a package folder shows
album art and title in Explorer, Finder, or a Linux file manager, instead of a
generic folder.

**Why.** This is the moment the format stops looking like a folder of files. It
is the single highest-impact "it feels real" change available, and it reaches
people who never open our apps at all.

**Value** medium · **Effort** high · **Serves** O3, O6 · **Depends on** SDK-11 ·
**Status** open

**Risks.** Three completely different native APIs, all unpleasant, some requiring
signed native code. Realistically pick one platform, or reduce the scope to a
desktop-entry and thumbnailer on Linux where it is easiest.

## APP-5 OMD Server: headless catalog daemon

**Pitch.** A headless service exposing a catalog over HTTP: list albums, read
manifests, stream audio, trigger packaging and burns on a connected drive, with
a small web UI.

**Why.** It moves OMD from "an app on my desktop" to "a thing that lives on my
NAS". It is also the shared backend that makes the mobile companion, the LAN
remote, and the web player possible, so it unlocks more of this category than
anything else in it.

**Value** high · **Effort** high · **Serves** O2, O3 · **Depends on** SDK-1,
SDK-2, CLI-2 · **Status** open

**Risks.** A network service means authentication, an update story, and a
security posture, none of which the project has today. Must stay self-hosted and
account-free to remain consistent with the project's scope boundaries.

## APP-6 Web label designer

**Pitch.** A browser tool for designing and printing OMD label sheets and
sleeves, with the same templates the `label` package uses.

**Why.** Labels are the part of the project that non-technical people care about,
and printing is inherently a desktop-and-browser activity. It reaches people who
want the physical object without wanting the toolchain.

**Value** low · **Effort** medium · **Serves** O6 · **Depends on** STU-13 ·
**Status** open

**Risks.** Duplicates Studio's labels feature, so it must share the `label`
package rather than reimplementing the templates.

## APP-7 Minimal player build

**Pitch.** A stripped OMD player: insert disc, read manifest, play. No catalog,
no burning, no import. Targeted at old hardware and appliance use.

**Why.** Studio is a full workstation and will keep growing. A minimal player is
what actually belongs on a shelf device, and it is the reference implementation
that proves a conformant player can be small, which is the whole argument of
objective O1.

**Value** medium · **Effort** medium · **Serves** O1, O4 · **Depends on** SDK-11
· **Status** open

**Risks.** A second player is a second thing to keep working. Only worth it if it
shares the `ui` package rather than forking Studio.

## APP-8 Metadata capture browser extension

**Pitch.** A browser extension that captures album metadata and artwork from a
purchase or release page and saves an import sidecar next to the downloaded
files.

**Why.** The most tedious part of packaging an album is typing metadata that
already existed on the page where the album was bought.

**Value** low · **Effort** medium · **Serves** O2, O3 · **Depends on** INT-1 ·
**Status** open

**Risks.** Per-site scrapers break constantly and are an endless maintenance
tail. A generic capture (page metadata plus manual confirmation) ages far better
than site-specific rules.

## APP-9 Terminal player

**Pitch.** A TUI album player: inspect a mounted disc or package and play it with
a track list, progress, and keyboard control, in the terminal.

**Why.** Small, fun, and it proves the SDK is genuinely usable outside a GUI. It
also serves headless and remote-machine use, and it is the kind of thing that
gets a project noticed by developers.

**Value** low · **Effort** low · **Serves** O1 · **Depends on** none ·
**Status** open

**Risks.** Audio output from a terminal app means delegating to `mpv` or `ffplay`
again, so it inherits their availability problems.

## APP-10 Project website

**Pitch.** A real landing site: what OMD is, a gallery of discs and labels, the
spec, the docs, and downloads.

**Why.** The project currently exists as a private repository. Nothing in this
catalog produces adoption if there is no place to send people, and the physical
object photographs well, which is a rare advantage for a software project.

**Value** high · **Effort** medium · **Serves** O2, O6 · **Depends on** COM-10 ·
**Status** open

**Risks.** Depends on a decision about making the repository public, and on
having something to download (CLI-10, STU-11) so the site is not a dead end.

## APP-11 Studio Lite in the browser

**Pitch.** A web build of the Studio UI running against fixture data, so anyone
can click through the real interface without installing anything.

**Why.** The screenshot harness and fixture data mode already exist, so most of
the machinery is built. It converts "here is a screenshot" into "here, try it",
which is a much stronger pitch on the website.

**Value** medium · **Effort** medium · **Serves** O2, O6 · **Depends on**
APP-10, SDK-11 · **Status** open

**Risks.** The renderer assumes `window.omd` from the Electron preload bridge, so
this needs a credible mock API layer. Risks becoming a second app to maintain if
the mock drifts from the real IPC surface.
