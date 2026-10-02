# Sending commands

`command()` sends any of the controller's commands by name. Your editor
completes each command's parameters and knows the type of its reply. Both come
from the SDK's [spec](#typing-outside-a-call), its list of every command.

```typescript
const reply = await omni.command("GetUIPoolTempCmd", { poolId: 1 });
// 84
console.log(reply.temp);
```

Every command has a page under [Commands](/commands/) with its parameters, its
reply, and whether it is verified on hardware. Use `command()` for anything the
[equipment layer](/guide/equipment) has no method for.

## Checking against the configuration and telemetry

`command()` checks every command against the cached configuration and telemetry
before it sends it:

- The telemetry says whether the controller is in normal operation. `command()`
  refuses a write with `SystemStateError` while the controller is off, or in a
  service mode or config mode.
- The configuration says what is installed. `command()` refuses a command with
  `EquipmentNotInstalledError` only when the configuration shows the equipment
  absent. See [Inventory](/guide/inventory).

A session with nothing cached refreshes before its first command. If the
controller does not respond, the command fails before anything is sent. After
that, the checks use the cache, so they are only as current as the last refresh.
If someone changed something from the panel or the app, refresh before the
write:

```typescript
import { timerParams } from "@rygine/omnilogic-local-sdk";

await omni.refresh({ refetch: true });
await omni.command("SetUIEquipmentCmd", {
  poolId: 1,
  equipmentId: 3,
  isOn: 1,
  ...timerParams(),
});
```

## Writing

A write (a command that changes something on the controller) returns nothing.
The controller acknowledges it and sends no reply. Commands with a timer block
take seven timer fields. `timerParams()` fills them with "no timer".
`countdownParams(minutes)` fills them with a countdown that switches the
equipment off again.

```typescript
import { countdownParams, timerParams } from "@rygine/omnilogic-local-sdk";

await omni.command("SetUIEquipmentCmd", {
  poolId: 1,
  equipmentId: 3,
  isOn: 1,
  ...timerParams(),
});

await omni.command("SetUIEquipmentCmd", {
  poolId: 1,
  equipmentId: 22,
  isOn: 1,
  ...countdownParams(30),
});
```

A write sets [`telemetryDirty`](/guide/quick-start#telemetrydirty), so the next
`refresh()` fetches again.

## Verifying a write

The controller acknowledges every well-formed command, including ones it then
ignores. To verify that a write worked, pass `verify`. After the send,
`command()` refreshes and calls your function to check for the change.

```typescript
await omni.command(
  "SetUIHeaterCmd",
  { poolId: 1, equipmentId: 4, data: 90 },
  {
    verify: () => omni.backyard.pool?.heater?.setPoint === 90,
    // keep checking for this long
    timeoutMs: 20000,
    // between checks
    pollMs: 4000,
    // resend once if the first never took
    attempts: 2,
    failure: "Unable to set the pool heater",
  },
);
```

If `verify` never returns true, `command()` throws `CommandFailedError` with
`failure` as its message. If the last send failed, its error is the `cause`. The
SDK never resends a write unless `attempts` asks for it.

## Options

```typescript
await omni.command(
  "GetUIPoolTempCmd",
  { poolId: 1 },
  {
    // send even where the checks would refuse
    force: true,
    // for this send only
    timings: { ackTimeoutMs: 10000 },
  },
);
```

- `force` skips the refresh before the first command, and sends even when:
  - the configuration shows the equipment is not installed
  - the controller is not in normal operation
  - the firmware is older than R0502000 or reports no version, which otherwise
    throws [`FirmwareTooOldError`](/guide/errors#firmwaretooolderror)

  `command()` still checks the parameters against the spec. See
  [Inventory](/guide/inventory).

- `timings` overrides the session's timeouts and pacing for one send. See
  [Timings](/guide/quick-start#timings).
- `attempts` is the maximum number of sends. For a write, `command()` sends
  until `verify` passes (default 1). Without `verify`, it sends a write once.
  For a read, it sends until the controller replies (default: the session's
  `readAttempts`).
- `raw: true` returns the reply's XML as the controller sent it, unparsed, or
  `undefined` for a command with no reply.

## Caveats

A few commands have a caveat, something they do that a caller would not expect.
The SDK sends these commands anyway and logs the caveat at the `warn` level. The
command's page shows the caveat in a box. If another command does the job
without the surprise, the box names it.

## Errors and rate limits

- The controller reads parameters by position and silently drops a command with
  one missing. If a parameter is missing or the wrong type, `command()` throws
  `OmniValidationError` before it sends.
- If a command expects a reply and gets none, `command()` throws
  `OmniTimeoutError`.
- About 25 commands in 2 seconds make the controller silent for a minute. To
  prevent this, the SDK sends one operation (a command or a fetch) at a time.
  Every `OmniLogic` in the process shares this limit. After one operation ends,
  the SDK waits `minSendGapMs` (500 ms by default) before it starts the next.

## Typing outside a call

The SDK exports `CommandName`, `CommandParams<N>`, and `CommandResult<N>`.
`COMMANDS` is the spec itself.

```typescript
import type { CommandParams } from "@rygine/omnilogic-local-sdk";

const params: CommandParams<"SetUIHeaterCmd"> = {
  poolId: 1,
  equipmentId: 4,
  data: 88,
};
await omni.command("SetUIHeaterCmd", params);
```

When you know the name only at run time, type it as `CommandName`. `command()`
then takes the parameters as a plain record of numbers and strings, and the
reply comes back as `unknown`.

```typescript
import type { CommandName } from "@rygine/omnilogic-local-sdk";

type Params = Record<string, number | string>;

function send(name: CommandName, params: Params) {
  return omni.command(name, params);
}
```
