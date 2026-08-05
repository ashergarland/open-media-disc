# OMD idea catalog

Every idea we have seriously considered for Open Media Disc, with a stable ID so
it can be referenced, scheduled, or rejected without being lost.

**Nothing here is committed work.** An idea becomes work only when the user
selects it and it is written into [`../ROADMAP.md`](../ROADMAP.md) as part of a
milestone. Use [`/brainstorm`](../../prompts/brainstorm.prompt.md) to add to or
triage this catalog.

## How to read an entry

Each idea carries:

- **Pitch:** one line a stranger could understand.
- **Why:** what it unlocks, tied to a roadmap objective.
- **Value / Effort:** low, medium, high. Effort is honest engineering cost,
  including maintenance.
- **Serves:** the roadmap objectives O1-O6 from [`../ROADMAP.md`](../ROADMAP.md).
- **Depends on:** other idea IDs or milestones that should land first.
- **Status:** `open`, `scheduled (<milestone-id>)`, `delivered`, or
  `rejected (<reason>)`.
- **Risks:** what could make this a bad idea, or what we do not know yet.

IDs are permanent. Never renumber, never reuse, never delete a rejected idea.

## The objectives, restated

| ID | Objective |
| --- | --- |
| O1 | Trivial to implement: anyone can write an OMD reader from the spec. |
| O2 | Trivial to adopt: album to disc, or disc to library, in minutes. |
| O3 | Everywhere the music already is: interoperate, do not demand migration. |
| O4 | Nobody is locked out: platform, ability, and budget. |
| O5 | Trustworthy over time: a disc burned today reads in ten years. |
| O6 | Worth showing people: the object and the software feel premium. |

## Categories

| File | Prefix | Ideas | What it covers |
| --- | --- | --- | --- |
| [format-and-spec.md](./format-and-spec.md) | `FMT` | 14 | The normative contract: manifest, layout, validation, versioning. |
| [core-sdk.md](./core-sdk.md) | `SDK` | 13 | `@open-media-disc/core`: the library everything else is built on. |
| [cli.md](./cli.md) | `CLI` | 10 | The `omd` command line and automation. |
| [omd-studio.md](./omd-studio.md) | `STU` | 15 | The desktop and touch app. |
| [accessibility.md](./accessibility.md) | `A11Y` | 10 | Accessibility, internationalization, and inclusion. |
| [new-apps.md](./new-apps.md) | `APP` | 11 | New surfaces: web, mobile, server, editor, shell. |
| [integrations.md](./integrations.md) | `INT` | 13 | Interop with the tools and services people already use. |
| [community-and-adoption.md](./community-and-adoption.md) | `COM` | 10 | Docs, spec process, second-language SDKs, brand, outreach. |
| [infrastructure.md](./infrastructure.md) | `INF` | 10 | CI, releases, testing, performance, developer ergonomics. |

Total: 106 ideas.

## Reading the catalog quickly

If you only read one thing per category, read these. They are the ideas that
most change what OMD **is**, rather than making it incrementally nicer.

| ID | Idea | Why it is on this list |
| --- | --- | --- |
| [FMT-1](./format-and-spec.md#fmt-1-conformance-suite-and-fixture-corpus) | Conformance suite and fixture corpus | Without it, "open format" is a claim, not a fact. Every other-language SDK depends on it. |
| [FMT-10](./format-and-spec.md#fmt-10-fidelity-facts-in-the-manifest) | Fidelity facts in the manifest | Players currently cannot state the truth about a file without decoding it. |
| [SDK-1](./core-sdk.md#sdk-1-cross-platform-burn-backends) | Cross-platform burn backends | Two thirds of potential users cannot burn a disc today. |
| [SDK-5](./core-sdk.md#sdk-5-typed-errors-with-stable-codes) | Typed errors with stable codes | Every app built on the SDK currently has to parse English. |
| [CLI-2](./cli.md#cli-2-json-output-on-every-command) | JSON output on every command | Turns the CLI into an integration point instead of a destination. |
| [APP-1](./new-apps.md#app-1-omd-web-inspector) | Web inspector | The cheapest possible "try OMD" with nothing to install. |
| [APP-5](./new-apps.md#app-5-omd-server-headless-catalog-daemon) | Headless catalog daemon | Makes OMD a thing that lives on a NAS, not just a desktop. |
| [INT-1](./integrations.md#int-1-musicbrainz-and-discogs-metadata-lookup) | MusicBrainz and Discogs lookup | The single biggest reduction in manual work per album. |
| [COM-4](./community-and-adoption.md#com-4-second-language-sdk) | Second-language SDK | The proof that the spec is implementable by someone who is not us. |
| [INF-1](./infrastructure.md#inf-1-continuous-integration) | Continuous integration | There is no CI today. Every cross-platform claim is currently untested. |
