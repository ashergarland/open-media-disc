---
mode: agent
description: Turn raw strategy and design source material into official public OMD documentation, while strictly respecting the public and internal split.
---

# Promote sources to public docs

Use this to convert raw ideas from the `sources/` material into polished, official
public documentation in the OMD repo. Source material is **input**, never a
deliverable: rewrite it, do not paste it.

## Where the material lives

- `design/` (in this repo) OAC-era design specs and product family docs.
- `ThePhysicalEdition/sources/sources_v2/omd/` OMD value proposition, cartridge
  and case design, decision records.
- `ThePhysicalEdition/sources/` company business and strategy material (mostly
  internal).

The public destination is this repo's [`documentation/`](../../documentation) and,
for normative format details, [`spec/`](../../spec).

## The public and internal split (do not cross it)

- **Public-safe:** the format, specs, SDK/CLI usage, the vision and design
  principles, the roadmap at a milestone level, and anything a community
  implementer needs.
- **Internal only:** pricing, margins, fulfillment economics, partner, artist,
  and label deals, go-to-market, and competitive strategy. These stay in
  `ThePhysicalEdition/sources/` and must never be copied into this repo.

If you are unsure whether something is public-safe, ask before writing it.

## How to promote

1. **Select.** Pick a specific idea or section to promote and confirm it is
   public-safe.
2. **Map it to a home.** Choose the right existing page rather than creating new
   files by default:
   - Vision and motivation to `documentation/what-is-omd.md`.
   - Format and package details to `spec/` first, then
     `documentation/package-format.md`.
   - Milestones and direction to `documentation/roadmap.md`.
   - Terminology to `documentation/glossary.md`.
3. **Rewrite.** Write fresh, clear public prose in the project's voice. Drop
   internal framing, sales language, and anything speculative that is not
   committed. Keep claims accurate to what actually exists today versus what is
   planned.
4. **Cross-check.** Make sure the promoted content agrees with the spec and the
   current code. The spec wins.
5. **Link, do not duplicate.** If two pages need the same idea, put it in one
   place and link to it.

## Definition of done

- The public docs gained a clear, accurate, self-contained section.
- No internal-only material leaked into the repo.
- Style holds: README stays lean, no em dash, no emojis in Markdown headers.
- If any promoted detail describes the format, it matches `spec/`.
