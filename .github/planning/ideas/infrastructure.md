# Ideas: engineering infrastructure

Prefix `INF`. The machinery that lets everything else in this catalog be built
safely and quickly.

Infrastructure is the category most easily postponed and the one that most
quietly determines how fast everything else moves. The specific situation here:
there is **no continuous integration**, Studio has **no tests**, and every
cross-platform claim in the documentation is currently unverified by anything but
inspection.

## INF-1 Continuous integration

**Pitch.** A GitHub Actions workflow running build, test, and lint on every push
and pull request, across Windows, Linux, and macOS, and on the supported Node
versions.

**Why.** The project is committed to cross-platform behavior and cannot currently
detect when it breaks. This is also the prerequisite for publishing anything
(CLI-10, STU-11), for the API surface check (SDK-13), and for every automated
quality gate below.

**Value** high · **Effort** low · **Serves** O4, O5 · **Depends on** none ·
**Status** open

**Risks.** Optical hardware is unavailable on runners, so the burn path stays
untested there. That is what INF-9 is for.

## INF-2 Release automation

**Pitch.** A scripted release: version bump across the packages that need it,
changelog generation from commits, tag creation using the per-package convention,
and artifact publishing.

**Why.** Releasing is currently a careful manual checklist, and it already has a
known trap (the Studio version lives in two places that must move together).
Every manual release is an opportunity to ship an inconsistent version.

**Value** medium · **Effort** medium · **Serves** O5 · **Depends on** INF-1 ·
**Status** open

**Risks.** Automated publishing needs credentials and a decision about what is
published where. Should follow the public repository decision (COM-1).

## INF-3 Studio test suite

**Pitch.** Real tests for the Studio package: unit tests for the renderer's pure
logic and state, and end-to-end tests driving the actual Electron app.

**Why.** Studio is the largest and most user-visible package and it has no tests
at all. Every change is verified by a human clicking through the app, which does
not scale and has already been identified as the main verification bottleneck.

**Value** high · **Effort** medium · **Serves** O5 · **Depends on** INF-1 ·
**Status** open

**Risks.** Electron end-to-end testing is slow and flaky, and the burn path
cannot be tested without hardware. The realistic split is heavy unit coverage of
state and view logic, plus a thin end-to-end smoke test.

## INF-4 Visual regression testing

**Pitch.** Use the existing headless screenshot harness as a baseline: capture
every view at several sizes and themes, and fail the build on unexpected visual
change.

**Why.** The harness already renders every view headlessly at any viewport, which
is most of the work. It would catch the exact class of layout regression that the
redesign spent multiple steps chasing, and it makes theme and token changes safe.

**Value** high · **Effort** medium · **Serves** O5, O6 · **Depends on** INF-1 ·
**Status** open

**Risks.** Visual baselines are noisy across platforms and font rendering. Pin to
one runner platform and allow a tolerance, or it becomes an ignored red build.

## INF-5 Coverage visibility

**Pitch.** Collect and report test coverage, with a floor that cannot regress,
starting from wherever the current number actually is.

**Why.** 157 tests sounds healthy but nobody knows what they cover. A floor
prevents the normal drift where new code arrives untested while the count keeps
rising.

**Value** low · **Effort** low · **Serves** O5 · **Depends on** INF-1 ·
**Status** open

**Risks.** Coverage targets encourage tests written for the metric. Use it as a
ratchet, not a goal.

## INF-6 Dependency and license hygiene

**Pitch.** Automated dependency updates, a vulnerability audit in CI, and a
license report for everything shipped, including the bundled ffmpeg binary.

**Why.** The project ships an MIT library plus a bundled binary with its own
licensing implications. Anyone considering building on OMD commercially will ask,
and the answer should already be written down.

**Value** medium · **Effort** low · **Serves** O5 · **Depends on** INF-1 ·
**Status** open

**Risks.** Automated update noise. Group and schedule rather than per-dependency
pull requests.

## INF-7 Documentation linting

**Pitch.** Automate the house rules: no em dash characters, no emojis in Markdown
headers, no broken relative links, and a check that spec and documentation
cross-references resolve.

**Why.** These rules are currently enforced by agent instructions and human
attention, which means they are enforced inconsistently. They are trivially
checkable, and the link checking in particular matters now that prompts, planning
files, and docs cross-reference each other heavily.

**Value** medium · **Effort** low · **Serves** O5, O6 · **Depends on** INF-1 ·
**Status** open

**Risks.** Little. Should cover `.github/` as well as `documentation/` and
`spec/`, since that is where most of the cross-links now live.

## INF-8 Performance benchmarks

**Pitch.** Benchmark the operations that scale with library size: packaging a
long album, checksumming a full disc, scanning a large catalog, and validating.

**Why.** Every operation is currently fast enough on a handful of test albums.
Nobody knows what happens at a thousand, and catalog scanning is already
suspected to be the limiting factor for real libraries.

**Value** low · **Effort** low · **Serves** O2 · **Depends on** INF-1 ·
**Status** open

**Risks.** Benchmarks on shared CI runners are noisy. Track trends, not absolute
numbers.

## INF-9 Hardware-free burn path testing

**Pitch.** Test the burn and verify pipeline without a drive: build the image,
mount or read it back, and verify checksums against the package, with the
hardware write step stubbed at a documented seam.

**Why.** The burn path is the most valuable and least tested code in the project,
and it is untestable on CI in its current shape. Testing everything except the
final write covers most of the logic and would have caught past image and
verification bugs.

**Value** high · **Effort** medium · **Serves** O5 · **Depends on** SDK-1,
INF-1 · **Status** open

**Risks.** The stub can drift from real hardware behavior, so it must not create
false confidence. The hardware acceptance prompt stays the final word.

## INF-10 Developer ergonomics

**Pitch.** Reduce the loop time: a single watch command across packages,
incremental builds, and a documented fast path for working on Studio without a
full monorepo rebuild.

**Why.** Studio currently reloads through a full typecheck and bundle, and the
documented workflow requires building the whole workspace first. Iteration speed
compounds across every other idea in this catalog.

**Value** medium · **Effort** medium · **Serves** O1 · **Depends on** none ·
**Status** open

**Risks.** Fast paths that diverge from the real build produce works-on-my-
machine failures. The CI build must remain the source of truth.
