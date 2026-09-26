# Quick start

Connect to a controller and read its configuration and telemetry.

```typescript
import { OmniLogic } from "@rygine/omnilogic-local-sdk";

const omni = new OmniLogic({ host: "192.168.1.100" });

// fetch config and telemetry
await omni.refresh();

console.log("Air temp:", omni.telemetry.backyard.airTemp);
console.log("Backyard:", omni.config.backyard.name);
```

## Options

```typescript
const omni = new OmniLogic({
  // the controller's IP address
  host: "192.168.1.100",
  // the controller's UDP port (this is the default)
  port: 10444,
  // seconds before refresh() fetches again (this is the default)
  // 0 fetches on every call
  cacheTTL: 30,
  // see Timings below
  timings: { minSendGapMs: 500 },
});
```

The full list of options is
[`OmniLogicOptions`](/reference/api/type-aliases/OmniLogicOptions).

## `refresh()`

Fetches the controller's telemetry and configuration. The cache is empty until
the first call.

```typescript
// first call: fetches telemetry and config
await omni.refresh();
// within cacheTTL and no write since: does nothing
await omni.refresh();
// always fetch fresh telemetry and config
await omni.refresh({ refetch: true });
```

Telemetry carries a checksum of the configuration. After the first call,
`refresh()` fetches the configuration again only when that checksum changes, or
when you pass `refetch: true`.

## `telemetry` and `config`

The telemetry and configuration from the last `refresh()`. Each throws if you
read it before the first `refresh()`. Neither sends anything to the controller.

```typescript
await omni.refresh();

// 78
console.log(omni.telemetry.backyard.airTemp);
// 84, or -1 with the pump off
console.log(omni.telemetry.bodiesOfWater[0].waterTemp);

// "Backyard"
console.log(omni.config.backyard.name);
for (const body of omni.config.backyard.bodiesOfWater) {
  // "Pool" "Filter Pump"; a body with no filter pump has no `filter`
  console.log(body.name, body.filter?.name);
}
```

The configuration is how the controller is set up. It holds:

- every body of water (a pool or a spa)
- every piece of equipment, with its names and settings
- the schedules, favorites, and themes

Telemetry is the live state. It shows the temperatures and current equipment
state. Each telemetry entry matches its configuration entry by `systemId`.

```typescript
for (const body of config.backyard.bodiesOfWater) {
  const row = telemetry.filters.find(
    (f) => f.systemId === body.filter?.systemId,
  );
  console.log(body.filter?.name, row?.filterSpeed, row?.whyFilterIsOn);
}
```

The full shapes are [`MSPConfig`](/reference/api/type-aliases/MSPConfig) and
[`Telemetry`](/reference/api/type-aliases/Telemetry). The
[equipment layer](/guide/equipment) does this matching for you.

## `configChecksum` and `mspVersion`

Two values from the cache. `configChecksum` is the checksum `refresh()` compares
to decide whether to fetch the configuration again. `mspVersion` is the
controller's firmware version, as telemetry reports it.

```typescript
// "R0502000"
console.log(omni.mspVersion);
```

## `telemetryDirty`

Whether the cache is out of date. A write (a command that changes something on
the controller) sets it to `true`. The next `refresh()` fetches even within
`cacheTTL` and sets it back to `false`.

```typescript
await omni.backyard.panel.setBeeper(false);
// true
console.log(omni.telemetryDirty);
await omni.refresh();
// false
console.log(omni.telemetryDirty);
```

## `inventory`

What is installed on each body of water, from the controller's latest
configuration. It throws if you read it before the first `refresh()`. Each
device's `installed` is `true` or `false`. `command()` checks it before it sends
a command.

```typescript
// true
console.log(omni.inventory.bodies[0].heater.installed);
// false
console.log(omni.inventory.bodies[0].chlorinator.installed);
```

See [Inventory](/guide/inventory).

## `backyard`

The configuration as bodies of water and devices. With it, you write
`omni.backyard.pool?.filter` instead of passing ids.

```typescript
await omni.refresh();
// 58 (percent)
console.log(omni.backyard.pool?.filter?.speed);
await omni.backyard.pool?.filter?.setMinSpeed(60);
```

See [The equipment layer](/guide/equipment).

## `command()`

Sends a command to the controller by name with its parameters.

```typescript
const reply = await omni.command("GetUIPoolTempCmd", { poolId: 1 });
// 84
console.log(reply.temp);
```

See [Sending commands](/guide/commands).

## Uncached fetches

`fetchTelemetry()`, `fetchConfig()`, and `fetchSysInfo()` fetch from the
controller and skip the cache. `refresh()` uses the first two. `fetchSysInfo()`
returns the system info: every component on the controller's bus, with its
Hayward Unique Address and firmware version. No other method reports these.

```typescript
const info = await omni.fetchSysInfo();
for (const c of info.components) {
  // "MSP" "MSP" "R0502000"
  console.log(c.devName, c.type, c.version);
}
```

## Timings

The timeouts and pacing for each send, as one object. The defaults keep the SDK
from sending more than the controller can accept. Override them for the session
with the `timings` option, or for one send with
`command(name, params, { timings })`.

```typescript
const omni = new OmniLogic({
  host: "192.168.1.100",
  timings: {
    // ms to wait for the controller to acknowledge a send
    ackTimeoutMs: 5000,
    // ms to wait for the next block of a reply
    nextMessageTimeoutMs: 10500,
    // ms after one operation ends before the next starts
    minSendGapMs: 500,
    // ms to pause after a theme write once the controller answers again
    settleGraceMs: 2000,
  },
});
// 5000
console.log(omni.timings.ackTimeoutMs);
```

If the controller acknowledges a read but sends no reply, the SDK sends the read
again, up to `readAttempts` sends in total (default 3). The SDK does not resend
a write this way.

```typescript
const omni = new OmniLogic({ host: "192.168.1.100", readAttempts: 5 });
```
