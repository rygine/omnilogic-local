# Errors

Every error the SDK throws extends `OmniLogicError`, so one `instanceof` check
catches them all. The subclasses say what happened.

```typescript
import {
  OmniLogicError,
  OmniTimeoutError,
  CommandFailedError,
} from "@rygine/omnilogic-local-sdk";

try {
  await omni.refresh();
} catch (e) {
  if (e instanceof OmniTimeoutError) {
    console.log("controller did not answer");
  } else if (e instanceof OmniLogicError) {
    console.log(e.name, e.message);
  } else {
    throw e;
  }
}
```

## `OmniTimeoutError`

The controller did not acknowledge a send, or did not reply to a command that
has a reply. [Troubleshooting](/guide/troubleshooting) lists the causes.

## `OmniValidationError`

A command parameter is missing or has the wrong type. The
[equipment layer](/guide/equipment) also throws it for a value that a method
does not accept, such as a set point outside the thermostat's range. The SDK
throws it before it sends anything.

## `FirmwareTooOldError`

`refresh()` refused because the controller reports firmware older than
`R0502000`, or reports no version at all. The error carries the reported
`version` (`undefined` when there is none) and the `minimum`, which is also
exported as `MIN_MSP_VERSION`.

`fetchTelemetry()` does not check the version, so you can still read it from a
controller that `refresh()` refuses. A version in a format other than
`R0502000`'s is not checked. `refresh({ force: true })` and
`command(name, params, { force: true })` both send anyway.

## `EquipmentNotInstalledError`

`command()` refused to send. The configuration does not show the equipment that
the command needs on the body of water that the command names (the pool or the
spa). The error carries `command`, `requirement`, `poolId`, and the `inventory`
the check used. `{ force: true }` sends anyway. See
[Inventory](/guide/inventory).

## `SystemStateError`

`command()` refused to send a write because the controller is off, in service
mode, or in config mode. Reads still go through. The error carries `command` and
`backyardState`. The SDK reads the state from the last telemetry it fetched. If
it has none cached, it refreshes first. `{ force: true }` sends anyway.

## `ReadingUnavailableError`

Your code asked for a reading while the controller is off, in service mode, or
in config mode. In those states the controller turns all equipment off and
reports some settings wrongly, such as a thermostat's set point or a
chlorinator's enabled flag. Those getters throw instead of returning them. The
error carries `backyardState`.

Getters for whether equipment is running do not throw. They report the equipment
as off: `isOn` is `false` and a pump's `speed` is `0`. See
[Troubleshooting](/guide/troubleshooting#all-equipment-shows-off-or-a-setting-throws).

## `CommandFailedError`

You passed `verify`, and the controller never showed the change. The error
carries the `command` and the number of `attempts`. Its message is the `failure`
text you passed. If the last attempt to send failed, that error is its `cause`.
These methods can throw it:

- every schedule and favorite write,
- a theme's `create`, `rename`, `remove`, and `schedule`,
- a light's `on`, `off`, and `setShow`.

The check needs a refresh, so a failed refresh also throws this error, with the
refresh error as its `cause`. The SDK does not resend in that case, because the
command may have worked.

```typescript
try {
  await omni.backyard.schedules.remove(28, { attempts: 3 });
} catch (e) {
  if (e instanceof CommandFailedError) {
    // "DeleteUIScheduleCmd" 3
    console.log(e.command, e.attempts);
  }
}
```
