# Hardware prompts (parked)

Prompts for work that needs **physical hardware**: a real writable disc, a
writer dock, a Raspberry Pi panel, or a cartridge shell. This work is
deliberately **parked** while the project focuses on the software ecosystem.

Nothing in this folder is scheduled. Do not pick these up unless the user says
hardware is the current focus. The reason for parking is not that the work is
unimportant: it is that hardware work cannot be verified by an agent and gates on
the user being at a bench with a drive and a disc.

The preserved plan for the hardware milestones (Writer Dock, Pi Player, OMD Deck,
portable player, cartridge-native) lives in
[`../../planning/hardware-milestones.md`](../../planning/hardware-milestones.md).

## Prompts

| # | Prompt | Does |
| --- | --- | --- |
| H1 | [hardware-01-studio-burn-and-play-acceptance](./hardware-01-studio-burn-and-play-acceptance.prompt.md) | Guided manual burn-and-play acceptance of OMD Studio on a real Windows machine with a real writable disc. Was step 10 of the delivered Studio redesign series. |

More hardware prompts get written when a hardware milestone is actually picked
up, using the same template as every other milestone:
[`../../planning/milestone-prompt-template.md`](../../planning/milestone-prompt-template.md).

## Why an agent cannot close these out

- Burning is destructive and irreversible on write-once media.
- Drive and disc behavior (remount timing, media descriptors, eject) only shows
  up on real hardware, and only the user can observe it.
- Never mark a hardware outcome verified unless the user confirms it on the
  physical disc.
