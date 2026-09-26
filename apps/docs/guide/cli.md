# The command line

From a shell, `omnilogic-local` reads a controller's configuration, telemetry,
and system info. It also sends any command in the
[spec](/guide/commands#typing-outside-a-call), the SDK's list of every command.

## Installing

```bash
npm install -g @rygine/omnilogic-local-cli
export OMNILOGIC_LOCAL_HOST=192.168.1.100
omnilogic-local config
```

The configuration prints as the XML the controller sent.

If you do not want to install it, use `npx` or `yarn dlx` with the same commands
and options:

```bash
npx @rygine/omnilogic-local-cli config --host 192.168.1.100
yarn dlx @rygine/omnilogic-local-cli config --host 192.168.1.100
```

## Usage

`omnilogic-local --help` prints:

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

Run 'omnilogic-local command <Name> --help' for more on a command.
```

## Reading the controller

```bash
omnilogic-local telemetry
omnilogic-local sysinfo
omnilogic-local config --format json | jq '.backyard.bodiesOfWater[].name'
```

With `--format json`, the output is shaped as
[`MSPConfig`](/reference/api/type-aliases/MSPConfig),
[`Telemetry`](/reference/api/type-aliases/Telemetry), and
[`SysInfo`](/reference/api/type-aliases/SysInfo). `config` also saves the
configuration for the checks below.

## Sending a command

```bash
omnilogic-local command GetUIPoolTempCmd --poolId 1
omnilogic-local command SetUIFilterSpeedCmd \
  --poolId 1 --equipmentId 3 --data 75
```

Each parameter on a command's page is a flag of the same name, such as
`--poolId`. Write a negative value as `--flag=-5`. The seven timer flags
(`--isCountDownTimer` through `--recurring`) are optional and default to no
timer. `command <Name> --help` shows them in brackets.

The CLI sends a read at once. For a write, it asks first:

```
SetUIFilterSpeedCmd writes to the controller. Send it? [y/N/a]
```

- `y` sends it once.
- `a` sends it and remembers the command in `safe.json`, in the same folder as
  the saved configuration. The CLI never asks for that command again. To get the
  prompt back, remove the file.
- `N` or any other answer sends nothing.

`--yes` answers yes for one run, for use in scripts.

If the CLI must ask but there is no terminal, it sends nothing. If you close the
input at the prompt, the CLI takes it as no.

## Checking before a send

The CLI checks each value against the spec. If a number is out of range, or a
string is not one the command accepts, the CLI sends nothing.

Before it sends, the CLI fetches the telemetry and gets the configuration. Then
it runs its own checks:

- The CLI refuses a write while the controller is not in normal operation,
  before it asks you to confirm.
- The CLI checks every id you pass against the configuration.

When the CLI sends, `command()` also runs
[its checks](/guide/commands#checking-against-the-configuration-and-telemetry).

`--force` skips both fetches and the checks against the configuration and
telemetry. The CLI still checks each value against the spec.

## The saved configuration

The CLI saves the configuration in `~/.config/omnilogic-local/config.json`. If
`XDG_CONFIG_HOME` is set, the folder is `$XDG_CONFIG_HOME/omnilogic-local`. If
the CLI cannot write to the folder, it continues and does not save. Unless you
pass `--quiet`, it prints a message.

The CLI reuses the saved configuration for `--cache-ttl` seconds unless the
controller reports a different one. `--cache-ttl 0` always fetches. The CLI
never reuses telemetry, because the controller's state can change between runs.

## Describing a command

```bash
omnilogic-local info
omnilogic-local info SetUIPoolFilterCmd
omnilogic-local command SetUIPoolFilterCmd --help
```

The list shows every command with its opcode and `read` or `write`.
`--format json` prints the spec entries instead. With a name, `info` shows that
command's parameters and their ranges, its reply, and what it needs installed.

## Output and exit codes

Progress goes to stderr, so you can pipe stdout to another program. If that
program stops early, as `head` does, the run ends without an error. `--quiet`
still prints the SDK's warnings. Attach the `--debug` log to bug reports.

The exit code says how a run ended:

- `0`: done.
- `1`: failed.
- `2`: a mistyped command or value. The CLI sent nothing.
- `3`: a write you did not confirm. The CLI sent nothing.

## Using with an agent

A coding agent can drive the controller through this command line. The skill
`omnilogic-local-cli` tells it how. It says which commands are reads, when a
write needs a person's yes, and how to find the command for a plain-language
request. Copy the skill's folder into the agent's skills folder, or install it
with the `skills` package through `npx`:

```bash
npx skills add rygine/omnilogic-local --skill omnilogic-local-cli
```
