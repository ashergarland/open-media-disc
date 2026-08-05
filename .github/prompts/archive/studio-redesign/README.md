# Archive: OMD Studio touch-first redesign (delivered)

This folder preserves a **completed** prompt series. Nothing here is scheduled
work. It is kept for history: the decisions, the gotchas, and the order the work
actually happened in.

Do not run these prompts. For live work, see
[`../../README.md`](../../README.md) and the tracker at
[`../../../planning/STATUS.md`](../../../planning/STATUS.md).

## What it delivered

The OMD Studio touch-first redesign: the app was rebuilt on the `--omd-*` design
token contract, given hub-and-spoke navigation, three token-map themes, and
small-screen and kiosk tuning for the Raspberry Pi panel. It shipped as
`@open-media-disc/studio` **0.2.0**, tagged `studio-v0.2.0`.

The working design brief for the series was
[`../../../../documentation/redesign-plan.md`](../../../../documentation/redesign-plan.md),
and the shipped result is described in
[`../../../../documentation/omd-studio.md`](../../../../documentation/omd-studio.md).

## The series

| # | Prompt | Delivered |
| --- | --- | --- |
| 01 | [redesign-01-labels-to-tokens](./redesign-01-labels-to-tokens.prompt.md) | Labels view rebuilt on the `--omd-*` component kit; its bridge CSS removed. |
| 02 | [redesign-02-editors-to-tokens](./redesign-02-editors-to-tokens.prompt.md) | Import review, mixtape, and album editor markup migrated to tokens. |
| 03 | [redesign-03-token-contract](./redesign-03-token-contract.prompt.md) | Token vocabulary expanded; the app renders from `components.css` alone. |
| 04 | [redesign-04-new-themes](./redesign-04-new-themes.prompt.md) | Token-map themes plus a live Themes picker; the old theme stylesheet retired. |
| 05 | [redesign-05-cleanup](./redesign-05-cleanup.prompt.md) | Dead code, CSS, assets, and dev tooling swept. |
| 06 | [redesign-06-home-hub](./redesign-06-home-hub.prompt.md) | Home hub rebuilt toward the premium touch mockup. |
| 07 | [redesign-07-pi-tuning](./redesign-07-pi-tuning.prompt.md) | Small-screen and kiosk tuning for the 7-10 inch Pi panel. |
| 08 | [redesign-08-docs-pass](./redesign-08-docs-pass.prompt.md) | Studio docs brought in line with the shipped app. |
| 09 | [redesign-09-release](./redesign-09-release.prompt.md) | Studio bumped to 0.2.0 and tagged `studio-v0.2.0`. |
| 10 | Moved to [`../../hardware/`](../../hardware/README.md) | Manual burn-and-play acceptance on real hardware, deferred with the hardware group. |

## The status file is worth reading

[`redesign-status.md`](./redesign-status.md) is the series' shared status file.
Its "Gotchas and durable facts" section still applies to the Studio codebase
today (border-box reset, `vmin` over `vw` for vertical sizing, CSP and CSSOM
rules, the two places the Studio version lives, the screenshot harness). Read it
before doing significant Studio UI work.
