# Ideas: accessibility and inclusion

Prefix `A11Y`. Making OMD usable regardless of ability, language, platform, or
budget.

This category serves objective **O4: nobody is locked out**, and it is the one
most likely to be quietly skipped, because nothing here produces a screenshot.
It is listed as its own category deliberately so that skipping it has to be a
decision rather than an omission.

The token architecture is an unusual advantage here: because themes are pure
`--omd-*` maps that cannot change layout, accessibility guarantees made once in
the component kit hold across every theme, forever. That is worth exploiting
before more themes exist.

## A11Y-1 Full keyboard navigation

**Pitch.** Every action in Studio reachable and operable from the keyboard: hub
tiles, screen navigation, the transport dock, dialogs, and the burn flow, with a
visible focus indicator defined in the token contract.

**Why.** The app was designed touch-first, and touch-first designs routinely end
up mouse-or-nothing on the desktop. Keyboard access is the baseline requirement
for screen reader users and for anyone who cannot use a pointer reliably.

**Value** high · **Effort** medium · **Serves** O4 · **Depends on** none ·
**Status** open

**Risks.** Focus management across a hub-and-spoke shell with a persistent dock
needs a deliberate model, not per-view patches. Retrofitting is much harder than
designing it in, which is an argument for doing it early.

## A11Y-2 Screen reader support

**Pitch.** Correct roles, names, and relationships throughout, plus live regions
announcing burn phase, progress, verification result, and errors.

**Why.** Burning is a long, destructive, multi-phase operation. A user who cannot
see the progress bar currently has no way to know whether a burn succeeded, which
is the worst possible thing to be uncertain about.

**Value** high · **Effort** medium · **Serves** O4 · **Depends on** A11Y-1 ·
**Status** open

**Risks.** Needs testing with a real screen reader (NVDA or Narrator on Windows,
Orca on Linux), which the agent cannot do. Requires user or contributor time.

## A11Y-3 Contrast as part of the token contract

**Pitch.** Define required contrast ratios between token pairs, and add an
automated check that fails the build when any built-in or imported theme violates
them.

**Why.** Themes are the app's identity and its biggest accessibility risk. An
automated contract means a beautiful theme cannot ship an unreadable one, and it
is what makes user-contributed themes (STU-8) safe to allow at all.

**Value** high · **Effort** medium · **Serves** O4, O6 · **Depends on** none ·
**Status** open

**Risks.** Overly strict ratios can rule out legitimate aesthetics. Needs
per-token-pair rules, distinguishing body text from decorative surfaces, rather
than one blanket number.

## A11Y-4 Reduced motion and no-flash

**Pitch.** Honor `prefers-reduced-motion`, and provide an explicit setting that
disables the spectrum analyser, equalizer animation, and any transition.

**Why.** Animated audio visualization is a genuine hazard for people with
vestibular disorders and photosensitivity, and the hub equalizer is exactly the
kind of animation that triggers it.

**Value** medium · **Effort** low · **Serves** O4 · **Depends on** none ·
**Status** open

**Risks.** Little. Mostly a matter of routing every animation through one
switch rather than scattering media queries.

## A11Y-5 Text scaling and large-type mode

**Pitch.** A type-scale setting independent of theme, verified against the
fit-to-viewport layout contract at every supported size.

**Why.** The Pi panel is a small screen often viewed from across a room, and the
desktop app is used by people who scale their whole OS. The layout is built on
`vmin`-derived sizing, so a scale factor is feasible, but nothing currently
verifies that large text does not break the bounded scroll regions.

**Value** medium · **Effort** medium · **Serves** O4 · **Depends on** STU-10 ·
**Status** open

**Risks.** The fit-to-viewport contract and large type are in direct tension. The
screenshot harness can verify this cheaply, which is the mitigation.

## A11Y-6 Never color alone

**Pitch.** Audit every status signal (valid, invalid, verified, failed, blank
disc, write-once) so each carries a shape, icon, or text label in addition to
color, and check the palettes against common color vision deficiencies.

**Why.** Burn state is safety-relevant: confusing "write-once, already used" with
"rewritable, ready" destroys a disc. That distinction must not rest on hue.

**Value** medium · **Effort** low · **Serves** O4, O5 · **Depends on** none ·
**Status** open

**Risks.** Little, and it improves the design generally.

## A11Y-7 Accessible label sheets

**Pitch.** Label templates with a large-print variant, high-contrast text, and a
layout that leaves room for a braille or tactile marker on the disc face.

**Why.** A shelf of physical discs is only browsable if the spines are legible.
This is the accessibility problem unique to a physical format, and nobody else
will solve it for us.

**Value** low · **Effort** low · **Serves** O4, O6 · **Depends on** FMT-13 ·
**Status** open

**Risks.** Real braille labeling needs an embosser, so the realistic deliverable
is a reserved tactile area plus large print, not braille rendering.

## A11Y-8 Accessibility statement and automated checks

**Pitch.** Publish what OMD Studio supports and what it does not, and run
automated accessibility checks in CI against the rendered views using the
existing headless harness.

**Why.** A written commitment is what turns accessibility from a sprint into a
standard. The harness already renders every view headlessly, so the checking
infrastructure is most of the way there.

**Value** medium · **Effort** medium · **Serves** O4 · **Depends on** INF-1,
INF-4 · **Status** open

**Risks.** Automated checks catch perhaps a third of real issues, so the
statement must not overclaim on the strength of a green build.

## A11Y-9 Internationalization

**Pitch.** Extract user-facing strings in Studio and the CLI into a message
catalog, support locale selection, and handle right-to-left layout in the shell.

**Why.** OMD is currently English-only in a domain (personal music collections)
that is universal. Non-Latin album titles already flow through the format, so the
data side is closer to ready than the interface side.

**Value** medium · **Effort** high · **Serves** O4 · **Depends on** FMT-12 ·
**Status** open

**Risks.** Large, invasive, and it commits the project to translation
maintenance. The string extraction is worth doing well before there are many more
screens, even if translations come much later.

## A11Y-10 Touch and reach audit for the panel

**Pitch.** Verify touch target sizes, spacing, and one-handed reachability across
the supported panel sizes and both orientations, using the screenshot harness
with a target overlay.

**Why.** The 44px minimum is stated but only spot-checked. On an appliance that
is the entire input method, a target that is technically 44px but adjacent to
another one is still a mis-tap.

**Value** medium · **Effort** low · **Serves** O4 · **Depends on** STU-10 ·
**Status** open

**Risks.** Little. Verifiable without hardware, which makes it unusually cheap
for an accessibility improvement.
