# Reporting a bug

[Open an issue](https://github.com/rygine/omnilogic-local/issues/new/choose) and
choose the template for the part you use: the SDK, the command line, the
Homebridge plugin, or the web app. Each template asks for the data below.

## Gathering the data

The most useful data, in this order:

1. The configuration: every body of water, piece of equipment, and setting.
2. The telemetry: what the controller reports now.
3. The request and reply XML, if the problem is one command.
4. A log, if the problem is in the SDK or the command line. See
   [Sending logs](/contribute/logs).

<!-- prettier-ignore -->
> [!NOTE]
> The files hold your equipment's names and settings. A log also holds your
> controller's IP address. None of them hold a password, because the
> controller has none.

The command line collects the first three. You do not need to install it. `npx`
runs it from npm:

```bash
npx @rygine/omnilogic-local-cli --version
```

With Yarn, use `yarn dlx @rygine/omnilogic-local-cli` in place of
`npx @rygine/omnilogic-local-cli` in every command on this page. Each command
needs Node.js 22 or later and a computer on the same network as the controller.

### 1. The configuration

Set your controller's IP address once, then save the configuration to a file:

```bash
export OMNILOGIC_LOCAL_HOST=192.168.1.100
npx @rygine/omnilogic-local-cli config > config.txt
```

`config.txt` holds the XML the controller sent. Attach the file to the issue. Do
not paste it. A configuration is often too large for an issue.

### 2. The telemetry

Make the problem happen, then save the telemetry while it happens:

```bash
npx @rygine/omnilogic-local-cli telemetry > telemetry.txt
```

Attach `telemetry.txt` to the issue, or paste it inside a code block. GitHub
hides XML pasted outside a code block.

### 3. The request and reply

<!-- prettier-ignore -->
> [!NOTE]
> If the command changes a setting or turns equipment on or off, a second run
> makes the change again. The command line asks before it sends such a
> command. Answer `y` only if the change is safe to repeat.

If the problem is one command, run that command again with `--verbose`:

```bash
npx @rygine/omnilogic-local-cli command GetUIPoolTempCmd --poolId 1 \
  --verbose 2>&1 | tee command.txt
```

Replace `GetUIPoolTempCmd --poolId 1` with your command and its parameters. The
command line prints the request XML before it sends the command, and the reply
XML after. `tee` shows the output and also saves it in `command.txt`. Paste the
file inside a code block, or attach it if it is long.

### The MSP firmware version

```bash
npx @rygine/omnilogic-local-cli sysinfo
```

The `Version` of the `MSP` component is the firmware version, such as
`R0502000`. The web app's System page also shows it.
