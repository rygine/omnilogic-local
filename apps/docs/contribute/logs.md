# Sending logs

Attach a log to your issue as text or a file, not a screenshot. It shows what
the SDK did before the problem.

## The SDK

Set `LOG_LEVEL` in the environment:

```bash
LOG_LEVEL=debug node your-script.js
LOG_LEVEL=trace node your-script.js   # the received frames too
```

Copy the console output from the first line of the failed operation to the
error. [Logging](/guide/logging) explains the levels.

## The command line

Add `--debug` to the command that failed. It turns on the SDK's log for that
run. `2>&1 | tee` shows the output and also saves it in a file:

```bash
omnilogic-local telemetry --debug 2>&1 | tee log.txt
```

If you do not have the command line installed, use
`npx @rygine/omnilogic-local-cli` or `yarn dlx @rygine/omnilogic-local-cli` in
place of `omnilogic-local`. Attach `log.txt` to the issue.
