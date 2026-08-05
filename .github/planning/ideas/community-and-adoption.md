# Ideas: community and adoption

Prefix `COM`. The work that turns a good format into a used format.

None of this is code, and that is why it is easy to defer indefinitely. The
uncomfortable truth behind objective O1 is that a format nobody else has
implemented is not open in any meaningful sense; it is just a program with a
specification attached.

## COM-1 Public repository decision

**Pitch.** Decide whether and when `open-media-disc` becomes public, and do the
preparation it requires: license headers, a contributor guide, a code of conduct,
security policy, and a scrub for anything internal.

**Why.** Every other idea in this category is blocked on it. The repository is
MIT-licensed and named "open", but it is currently private, which is a
contradiction that has to be resolved before any outreach is worth doing.

**Value** high · **Effort** low · **Serves** O1, O2 · **Depends on** none ·
**Status** open

**Risks.** Going public invites issues and pull requests, which is a real time
commitment. It also makes early design mistakes permanent in the record. Both are
survivable; being permanently private is not, for a format.

## COM-2 Specification change process

**Pitch.** A written process for changing the format: how a change is proposed,
what it must include (motivation, compatibility impact, migration), who decides,
and how it is versioned.

**Why.** The project already has a strong spec-first culture, but it is enforced
by convention and by agent instructions rather than by a process anyone outside
could follow. A format with no visible change process is one nobody will build a
product on.

**Value** medium · **Effort** low · **Serves** O1, O5 · **Depends on** FMT-11 ·
**Status** open

**Risks.** Process weight for a project with one maintainer. Keep it to a page.

## COM-3 Implement OMD in an afternoon

**Pitch.** A tutorial that walks through writing a minimal OMD reader from
scratch, with a working reference reader in two or three languages, each under a
few hundred lines and each passing the conformance suite.

**Why.** It is the direct proof of objective O1, and it is the single most
persuasive artifact the project could produce for a developer audience. A
specification tells you the format is implementable; a hundred-line reader in a
language you use shows you.

**Value** high · **Effort** medium · **Serves** O1 · **Depends on** FMT-1 ·
**Status** open

**Risks.** Reference readers must stay correct as the format evolves, so they
need to be in CI against the conformance suite, not just written once.

## COM-4 Second-language SDK

**Pitch.** A full SDK in a second language (Rust or Python), covering create,
validate, and inspect, verified against the conformance suite.

**Why.** It is the test of whether the spec is genuinely implementable by someone
who is not holding the TypeScript source in their head. Every ambiguity in the
spec surfaces during this work, which is exactly why it is valuable. Rust also
points toward embedded and hardware use; Python points toward scripting and
integration with tools like beets.

**Value** high · **Effort** high · **Serves** O1, O4 · **Depends on** FMT-1 ·
**Status** open

**Risks.** A second implementation is a second thing to maintain forever. Scope
it to read and validate first, since writing packages is where most of the
complexity lives, and a reader is what the ecosystem actually needs more of.

## COM-5 Public sample corpus

**Pitch.** A downloadable set of real, legally clean OMD packages: public domain
and Creative Commons albums, spanning codecs, sizes, edge cases, and deliberate
faults.

**Why.** Every implementer needs something to test against on day one, and no
implementer wants to construct valid test data by hand before their code works.
It doubles as a demonstration of the format for anyone evaluating it.

**Value** medium · **Effort** medium · **Serves** O1 · **Depends on** FMT-1,
COM-1 · **Status** open

**Risks.** Real audio is large. Needs hosting outside git, and every track needs
a verified license.

## COM-6 Contribution scaffolding

**Pitch.** Issue forms, a pull request template with the docs-in-sync checklist,
a labeling scheme, and a short architecture note explaining how the packages fit
together.

**Why.** The docs-in-sync rule is currently enforced through agent instructions.
A human contributor has no equivalent, so the first outside contribution will
break the convention that keeps the project coherent.

**Value** medium · **Effort** low · **Serves** O1 · **Depends on** COM-1 ·
**Status** open

**Risks.** Little. The main failure is templates so long nobody reads them.

## COM-7 Visual documentation

**Pitch.** Short recordings in the docs: packaging an album, burning a disc,
playing it back, printing a label. Plus real photographs of finished discs and
labels.

**Why.** This is a physical format, and text cannot convey it. The strongest
argument for OMD is watching a disc come out of a drive with a printed label on
it, and that argument is currently unavailable to anyone who has not built the
project.

**Value** medium · **Effort** low · **Serves** O2, O6 · **Depends on** none ·
**Status** open

**Risks.** Recordings age faster than prose, especially across a UI redesign.

## COM-8 Implementation and compatibility registry

**Pitch.** A maintained list of known OMD implementations, tools, and verified
compatible drives and media, with conformance status.

**Why.** It tells a newcomer that the format exists beyond this repository, and
the media compatibility list is genuinely useful: knowing which 8cm discs and
which drives actually work saves people money and frustration.

**Value** low · **Effort** low · **Serves** O1, O2 · **Depends on** COM-1 ·
**Status** open

**Risks.** A list with one entry is worse than no list. Wait until there is
something to list.

## COM-9 The skeptic's FAQ

**Pitch.** Direct, unflinching answers to the obvious objections: why not just a
folder, why not CD-DA, why not a USB stick, why optical media in the streaming
era, why not FLAC in a zip.

**Why.** Everyone technical asks these within thirty seconds, and the project's
answers are genuinely good. Leaving them scattered across design notes means the
first impression is often dismissal.

**Value** medium · **Effort** low · **Serves** O2 · **Depends on** none ·
**Status** open

**Risks.** Defensive writing reads badly. The tone has to be confident and
willing to concede the real tradeoffs.

## COM-10 Brand and asset kit

**Pitch.** A consistent visual identity: logo, wordmark, disc face and label
templates, color palette tied to the theme tokens, and usage guidance.

**Why.** A format's identity is what makes a disc recognizable across everyone's
shelves. It is also what separates a project that looks like a product from one
that looks like a repository, which is objective O6 in its purest form.

**Value** medium · **Effort** medium · **Serves** O6 · **Depends on** none ·
**Status** open

**Risks.** Design work is hard to do well internally and easy to redo badly
later. Worth doing once, deliberately, rather than accreting.
