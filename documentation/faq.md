# FAQ

## What is Open Media Disc in one sentence?

An open-source physical music format that turns owned FLAC albums into verified,
self-describing packages meant for cheap, rewritable 8cm DVD-RW media.

## Is this a backup tool?

No. OMD is an **album format**. It produces album objects with a manifest, cover
art, and checksums — the disc is presented as an album, not a folder of files.

## Does v0.1 burn discs?

No. v0.1 is pure software: **album folder in → verified package out**. Burning,
imaging, and hardware come in later milestones. See the [Roadmap](./roadmap.md).

## Why FLAC and not MP3 or DVD-Audio?

FLAC is lossless, open, and easy to tag and verify. DVD-Audio is optimized for
authored audiophile releases and niche players; OMD optimizes for cheap,
repeatable personal writing with directly recoverable files. DVD-Audio may
become an optional export mode later.

## Why 8cm DVD-RW?

It's a cheap, rewritable, commodity optical medium with a satisfying
small-disc/cartridge feel (~1.4 GB usable), which fits most FLAC albums.

## My album is larger than 1.4 GB. What happens?

`inspect` shows it as over budget and `validate` warns (an error with
`--strict`). The package is still created. Downsampled FLAC and multi-disc sets
are future options.

## Can I use the library without the CLI?

Yes. Everything the CLI does is available in
[`@open-album-cartridge/core`](./sdk-reference.md).

## What does "VALID" actually guarantee?

Zero `error`-severity findings: required files present, manifest schema-valid,
every listed track exists and is FLAC, track numbers unique, counts match, and
all checksums verify. Warnings (like missing cover art) don't affect validity.
See the [Validation Guide](./validation.md).

## Where's the authoritative format definition?

In [`spec/`](../spec). When documentation and spec disagree, the spec wins —
please report the doc bug.

## Can I distribute music with OMD?

Only music you own the rights to. OMD is for personal, owned-library album
objects. It has no DRM and takes no position on licensing beyond "don't infringe."

## The `omd` command isn't found. Why?

Run `pnpm build` first. The root `pnpm omd` script runs the compiled CLI at
`packages/cli/dist/bin/omd.js`. See [Installation](./installation.md).

## How do I contribute?

See [Contributing](./contributing.md). One rule up front: **code and docs change
together**.
