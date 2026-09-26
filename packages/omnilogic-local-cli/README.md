# @rygine/omnilogic-local-cli

Command line for local control of Hayward OmniLogic pool controllers. No
internet or cloud login required.

## Requirements

- Node.js >= 22
- Network access to the OmniLogic controller on port 10444

## Installation

```bash
npm install -g @rygine/omnilogic-local-cli
```

Or run it without installing:

```bash
npx @rygine/omnilogic-local-cli config --host 192.168.1.100
yarn dlx @rygine/omnilogic-local-cli config --host 192.168.1.100
```

## Usage

```
Usage: omnilogic-local <command> [options]

Local control of a Hayward OmniLogic controller

Commands:
  config            Get the configuration
  telemetry         Get the current equipment status
  sysinfo           Get the hardware and firmware versions
  command <Name>    Send a command
  info [<Name>]     Describe a command, or list all

Options:
  --host <ip>          Controller address (env: OMNILOGIC_LOCAL_HOST)
  --port <n>           Controller port (env: OMNILOGIC_LOCAL_PORT, default: 10444)
  --format <xml|json>  Output format (default: xml)
  --cache-ttl <sec>    Seconds to reuse a fetched configuration (default: 300)
  -y, --yes            Send a write without asking
  --force              Send even where the checks would refuse
  -q, --quiet          Print only the result
  -v, --verbose        Show the XML sent and the ids resolved
  --debug              Show the SDK log
  -h, --help           Show help
  --version            Show version

Run 'omnilogic-local <command> --help' for more on a command.
```

Set `OMNILOGIC_LOCAL_HOST` once instead of passing `--host` every time.

```bash
export OMNILOGIC_LOCAL_HOST=192.168.1.100
omnilogic-local config
omnilogic-local telemetry --format json | jq '.bodiesOfWater[].waterTemp'
omnilogic-local command GetUIPoolTempCmd --poolId 1
omnilogic-local command SetUIFilterSpeedCmd --poolId 1 --equipmentId 3 --data 75
```

A negative value is written `--flag=-5`.

The output is the controller's XML as it sent it, or JSON with `--format json`.
Everything else goes to stderr, so the output pipes.

A command that only reads is sent as soon as you ask. Anything else asks first:
`y` sends it once, `a` sends it and remembers the command in
`~/.config/omnilogic-local/safe.json` (under `$XDG_CONFIG_HOME` when set) so it
never asks for that one again. `--yes` answers for one run.

## Disclaimer

This software is not produced, endorsed, or supported by Hayward Industries,
Inc. "Hayward" and "OmniLogic" are trademarks of their respective owners.
