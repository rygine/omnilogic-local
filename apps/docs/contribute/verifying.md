# Verifying a command on your hardware

Run a command on your controller and report what happened. Each report can
change a command's status in the [status tables](/commands/status).

## Running a read-only command

The command line's `telemetry` and `config`, and any `Get*` command that takes
only ids, change nothing on the controller. Run one with the command line. You
do not need to install it:

```bash
npx @rygine/omnilogic-local-cli command GetUIPoolTempCmd --poolId 1 \
  --host 192.168.1.100 --verbose 2>&1 | tee command.txt
```

With Yarn, use `yarn dlx @rygine/omnilogic-local-cli` in place of
`npx @rygine/omnilogic-local-cli`. `--verbose` prints the request XML before the
reply XML. `tee` shows both and also saves them in `command.txt`.

## Running a command that changes something

Any other command can change a setting or turn equipment on or off.

<!-- prettier-ignore -->
> [!NOTE]
> Send one command at a time, and watch the equipment as you do. A command
> that is not verified yet can do something its page does not describe.

1. Read the command's page.
2. Run the command.
3. When the command line asks you to confirm, answer `y`.
4. Check the configuration and the telemetry. Only they show whether the command
   worked. The acknowledgment does not.

## Reporting

[Open an issue](https://github.com/rygine/omnilogic-local/issues/new/choose)
with the **Command verified** template. It asks for:

- your MSP firmware version, which the web app's System page and `sysinfo` show,
- the command and the parameters you sent,
- `command.txt`, with the request and the reply,
- what changed on the equipment, the configuration, or the telemetry, and when
  you looked.

Or edit the command's page yourself:

1. Set `status`.
2. Add your firmware and model.
3. If the command does something other than its summary says, fix the summary.

See [Editing a page](/contribute/editing).
