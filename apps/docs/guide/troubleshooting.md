# Troubleshooting

## The controller does not respond

An operation times out with `OmniTimeoutError`, or fails at once with a network
error such as `EHOSTUNREACH`. Check, in order:

1. The address. `ping` the controller. The panel shows the controller's IP
   address in its network settings.
2. The port. The controller listens on UDP port 10444. A firewall between you
   and the controller must pass UDP, not only TCP.
3. Your own machine. If an operation fails with `EHOSTUNREACH` and the
   controller answers `ping`, your operating system blocked the message. On
   macOS, allow the terminal or app that runs Node under System Settings,
   Privacy & Security, Local Network.
4. Load. The controller is silent for about a minute when it gets too many
   commands (about 25 in 2 seconds). The SDK sends one operation at a time per
   process, 500 ms after the one before it ends. Two processes do not share that
   queue. Wait a minute, then try one read.
5. Stalls. The controller can be silent for several minutes even when nothing is
   sent to it. If a read fails and the same read succeeds a few minutes later,
   it was a stall. Wait a few minutes, then try the read again.

## A command is acknowledged but nothing happens

The controller acknowledges every well-formed command, including ones it then
ignores. Check the command's page. Its status says whether it is verified on
hardware. Its caveat, a warning box at the top of the page, says when it does
something other than what its name suggests. To verify that a write worked, pass
`verify` to `command()`. See [Sending commands](/guide/commands).

## A write shows the old value

Equipment takes a moment to move, and the telemetry lags behind it. A
`refresh()` in the first few seconds after a write can show the old state. Wait
a few seconds and refresh again. You can also pass `verify` with a `timeoutMs`,
and `command()` polls for you.

## A reading is `undefined`

When the controller has no reading, it reports a sentinel (a placeholder value)
instead. It does this for the water temperature while the pump is off, and for
the air temperature while the sensor is unplugged. The
[equipment layer](/guide/equipment) returns `undefined` for these. The raw
sentinel is on the device's `state`.

## All equipment shows off, or a setting throws

When the controller is off, in service mode, or in config mode (the panel's
configuration wizard), it turns all equipment off. The SDK reports all equipment
as off. Settings that the controller reports wrongly in those states throw
[`ReadingUnavailableError`](/guide/errors#readingunavailableerror).
`omni.backyard.state.state` is `1` in normal operation. To get the readings
back, leave the mode on the panel.

The controller still reports values in those states, but they do not describe
the equipment. A stopped pump still reports a speed, and the air and water
temperatures are placeholder values. The equipment layer ignores them, so
readings stay off or `undefined` until the controller returns to normal
operation. The raw rows stay on each device's `state`.

## Seeing what is sent

Set `LOG_LEVEL=debug` or `LOG_LEVEL=trace`. See [Logging](/guide/logging).
