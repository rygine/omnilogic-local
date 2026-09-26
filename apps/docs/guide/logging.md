# Logging

By default the SDK prints only warnings and errors. To see more, set the
`LOG_LEVEL` environment variable. You do not configure logging in code.

```bash
LOG_LEVEL=debug node app.js   # every operation and its outcome
LOG_LEVEL=trace node app.js   # adds every frame received
LOG_LEVEL=off node app.js     # silent, including errors
```

Levels are `trace`, `debug`, `info`, `warn`, `error`, and `off`. An unknown
value counts as `warn`. At `warn`, the default, you see a command's caveat (the
warning on its command page) when the SDK sends it.

## Reading the output

Each record is one line, with the namespace in brackets and structured fields as
`key=value`:

```
debug [command] GetUIPoolTempCmd opcode=25 poolId=1
debug [protocol] opening socket host=192.168.1.100 port=10444
debug [command] parsed response name=GetUIPoolTempCmd poolId=1 temp=84
```

The namespaces:

- `protocol` is the UDP layer. It logs sockets, the pause between sends,
  acknowledgments, and how it joins replies that arrive in several parts.
- `command` logs each command, with its parameters, its reply, and its caveat if
  any.
- `omnilogic` is the session. It logs what `refresh()` decided, the equipment
  checks, and the result of each `verify`.
- `equipment` logs the [equipment layer](/guide/equipment)'s own waits, such as
  the wait for a light to settle.

The logger passes an `Error` field to the console as a separate argument, so the
console prints the error's full stack.

## When reporting a problem

Run with `LOG_LEVEL=debug` and do the steps in [Sending logs](/contribute/logs).
