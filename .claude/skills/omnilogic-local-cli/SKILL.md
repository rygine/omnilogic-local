---
name: omnilogic-local-cli
description:
  Use when a task needs a Hayward OmniLogic controller on the local network:
  reading its configuration, telemetry, or boards, sending any of its commands,
  or checking what a command does before sending it, through the
  omnilogic-local command line.
---

# Reaching the controller

`omnilogic-local` is a command line for a Hayward OmniLogic controller on the
local network. It reads the configuration, telemetry, and system info, and sends
any command the controller handles.

## Run it

Run the published package without installing it:

```bash
npx @rygine/omnilogic-local-cli --help
```

With Yarn, use `yarn dlx @rygine/omnilogic-local-cli`. Inside the
`omnilogic-local` repository, run `yarn build`, then
`node packages/omnilogic-local-cli/dist/index.js`. Below, `omnilogic-local`
stands for whichever applies.

Set `OMNILOGIC_LOCAL_HOST` for the session, or pass `--host` each time. The user
gives the controller's address. Never guess one.

## Finding the command

A request arrives in plain words: turn the pump on, set the heater to 84, run
the party theme. Find the command for it, and never send one on its name alone.

1. `omnilogic-local info` lists every command with its opcode and `read` or
   `write`. Pick the candidates from their names, such as `SetUIFilterSpeedCmd`.
2. Read each candidate's page at
   `https://github.com/rygine/omnilogic-local/blob/main/apps/docs/commands/<Name>.md`.
   Its frontmatter `summary` says what it does, and `status` says whether it
   works on hardware: `verified`, `unverified`, or `unusable`. The page also
   gives each parameter and an example call.
3. The guide pages in `apps/docs/guide/` (`equipment.md`, `schedules.md`,
   `favorites.md`, `themes.md`) describe the same operations.
4. The ids come from `config`. A body of water's `systemId` is the `poolId`, and
   the equipment's own `systemId` is the `equipmentId`. Use `--format json` and
   `jq` to find them by name.

Prefer a `verified` command. Say so when only an `unverified` one fits. Do not
send an `unusable` one.

## Before any command

```bash
omnilogic-local info <Name>
```

The first line ends in `read` or `write`. A `read` command only reads, and the
command line sends it without asking. A `write` command acts on the pool. The
lines below it give each parameter's range and the reply.

## Reads are free

Run `config`, `telemetry`, `sysinfo`, and any `read` command whenever a task
needs the facts. Add `--format json` when the output feeds a check, and
`--debug` when the output is for a bug report.

## Writes need the user's yes, every run

Send a `write` command only after the user says yes in chat for that command,
with those parameters, for that run. Then send it with `--yes` so the prompt
does not block. One yes covers one send. A second send is a second question.

- Never answer `a` at the prompt.
- Never write or edit `~/.config/omnilogic-local/safe.json`.
- Never pass `--force` to get past a refused id, an inventory check, or a
  controller that is not in normal operation. Those are the user's decisions.

A heater write can start a gas burner or a heat pump. Before you ask, tell the
user the set point and the mode the write leaves.

## Reporting

Give the exact command line you sent, what the controller answered, and what the
configuration and telemetry showed afterwards. If a run shows that an
`unverified` command works, tell the user. The project takes a report through
its "Command verified" issue template.
