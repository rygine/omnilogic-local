# Controlling equipment

`omni.backyard` gives you the controller's equipment as objects. The backyard
holds the bodies of water (a pool or a spa), each with its filter pump, heater,
chlorinator, pumps, lights, and relays. Each device has getters for the values
you can read and methods for the values you can set.

```typescript
await omni.refresh();

// "Pool" 84
console.log(omni.backyard.pool?.name, omni.backyard.pool?.waterTemp);

await omni.backyard.pool?.filter?.setSpeed(80);
await omni.backyard.pool?.heater?.setSetPoint(88);
await omni.backyard.pool?.lights[0]?.on();
```

A getter returns a plain value from the [cache](/guide/quick-start#refresh), so
it sends nothing to the controller. The value changes only on the next
`refresh()`.

## Writing to the controller

Most write methods send one command and resolve when the controller acknowledges
it. But an acknowledgment does not prove that the command worked, because the
controller can ignore a command after it acknowledges it. To find out, call
`refresh()` and read the value again.

These methods verify the result for you. They refresh after they send the
command, and throw `CommandFailedError` if the new value does not appear. They
take `{ attempts }` to send the command again before they throw:

- [Schedules](/guide/schedules): `create`, `update`, `setEnabled`, `remove`
- [Favorites](/guide/favorites): `create`, `createForTheme`, `remove`
- [Themes](/guide/themes): `create`, `rename`, `remove`, and `schedule`, which
  takes no `{ attempts }`
- [Lights](#lights): `on`, `off`, `setShow`

```typescript
await omni.backyard.schedules.remove(28, { attempts: 3 });
```

The SDK does not verify the result of any other write method. Equipment takes
time to change, and the [telemetry](/guide/quick-start#telemetry-and-config)
shows the change later. If you call `refresh()` immediately after a write
method, a getter often shows the old value. To see the new value, wait a few
seconds and call `refresh()` again. Or send the command through `command()` with
`verify` and `timeoutMs`, and `command()` polls for you. See
[Sending commands](/guide/commands).

## Bodies of water

```typescript
// the body of type BOW_POOL, or undefined
omni.backyard.pool;
// the body of type BOW_SPA, or undefined
omni.backyard.spa;
// every body, in the controller's order
omni.backyard.bodies;
// by name or by systemId
omni.backyard.body("Pool");
// the backyard air temperature, or undefined with no reading
omni.backyard.airTemp;
// true only while the controller is in normal operation
omni.backyard.running;
// "On", "Off", "Service Mode", "Config Mode", or "Timed Service Mode"
omni.backyard.systemState;
```

While the controller is not running, the SDK reports all equipment as off.
`isOn` is `false`, a filter's `speed` is `0`, and some getters that read the
telemetry, such as the thermostat's `setPoint`, throw `ReadingUnavailableError`.

A body has `name`, `systemId`, and `waterTemp`. `waterTemp` is `undefined` while
there is no reading, for example when the filter pump is off. A body has one
device in each of `filter`, `heater`, `chlorinator`, and `csad`, and a list in
each of `pumps`, `lights`, and `relays`. When the configuration shows nothing
installed, a device is `undefined` and a list is empty. For this reason, the
examples on this page use `?.`.

Equipment wired to the backyard rather than to a body, such as landscape lights
on their own relay, is in `omni.backyard.relays` and `omni.backyard.lights`.

```typescript
// "Yard Lights"
omni.backyard.relays[0]?.name;
await omni.backyard.relays[0]?.on();
await omni.backyard.lights[0]?.off();
```

## Pumps

A body's `pumps` list holds every pump on the body. The filter pump is first, if
there is one, then any pump that drives jets, a fountain, or a waterfall. Every
pump has the getters and the `setSpeed()` method shown here.

```typescript
// ["Filter Pump", "Jet Pump"]
omni.backyard.spa?.pumps.map((p) => p.name);
// "PMP_VARIABLE_SPEED_PUMP", the speeds it can run
omni.backyard.spa?.pumps[1]?.type;
// "PMP_JETS", what it drives, absent on the filter pump
omni.backyard.spa?.pumps[1]?.function;
// 75
omni.backyard.spa?.pumps[1]?.speed;
// true
omni.backyard.spa?.pumps[1]?.isOn;
// true only while the motor turns, whatever isOn says
omni.backyard.spa?.pumps[1]?.isRunning;

await omni.backyard.spa?.pumps[1]?.setSpeed(75);
```

`setSpeed` on a pump other than the filter pump is not verified on hardware.

Every pump also has `status`, `lastSpeed`, `whyOn`, and `onCountdown`, shown on
the filter pump below. The filter pump and other pumps use different codes for
`status` and `whyOn`. The SDK decodes each with the list for that kind of pump.
For example, a state code of 2 is "Priming" on the filter pump and "On (Freeze
Protect)" on any other pump.

The filter pump is the same object in `pumps` and on `filter`. Use `filter` for
the members that only the filter pump has.

## The filter pump

```typescript
// 58
omni.backyard.pool?.filter?.speed;
// true
omni.backyard.pool?.filter?.isOn;
// true only while the motor turns, whatever isOn says
omni.backyard.pool?.filter?.isRunning;
// "On"
omni.backyard.pool?.filter?.status;
// the speed a plain turn-on resumes, kept while the pump is off
omni.backyard.pool?.filter?.lastSpeed;
// true while the pump primes after a start
omni.backyard.pool?.filter?.isPriming;
// true while it runs on a countdown
omni.backyard.pool?.filter?.onCountdown;
// why it is running: "Freeze Protect", "Superchlorinate", "Manual On"…
omni.backyard.pool?.filter?.whyOn;
// "Pool Only", "Spa Only", "Spillover", "Low Priority Heat"…
omni.backyard.pool?.filter?.valvePosition;
// the speed the pump reports, which lags the speed you set
omni.backyard.pool?.filter?.reportedSpeed;
// watts
omni.backyard.pool?.filter?.power;

// a percent, whatever the speed format
await omni.backyard.pool?.filter?.setSpeed(80);
// off
await omni.backyard.pool?.filter?.setSpeed(0);
```

Speeds are percents, whatever the speed format. The SDK does not convert them.
After a start, the pump primes at high speed for its priming duration and then
runs at the speed you set. Immediately after the start, `speed` shows 100.

Each of these settings has a getter that reads the configuration, and a setter:

- `primingDuration`
- `cooldownDuration`
- `sharedFilterTimeout`
- `minSpeed` and `maxSpeed`
- `freezeProtect`, `freezeProtectTemp`, `freezeProtectSpeed`, and
  `freezeProtectOverrideInterval`
- `offDuringValveChange`
- `flowMonitor`

`lowSpeed`, `mediumSpeed`, and `highSpeed` give the speeds of the Low, Medium,
and High presets. They read the configuration and have no setter.

```typescript
// 38
console.log(omni.backyard.pool?.filter?.freezeProtectTemp);
// °F on every controller
await omni.backyard.pool?.filter?.setFreezeProtectTemp(36);
```

`diagnostics()` asks the controller for the variable-speed drive's power, error
state, and firmware revisions.

## The heater

```typescript
// 88
omni.backyard.pool?.heater?.setPoint;
// false
omni.backyard.pool?.heater?.enabled;
// "Heat"
omni.backyard.pool?.heater?.mode;
// the solar loop's target, reported even with no solar loop
omni.backyard.pool?.heater?.solarSetPoint;
// the first heat source: "Off", "On", "Pause", or "Cool Down"
omni.backyard.pool?.heater?.applianceState;

await omni.backyard.pool?.heater?.setSetPoint(90);
await omni.backyard.pool?.heater?.setSolarSetPoint(92);
await omni.backyard.pool?.heater?.setEnabled(true);
```

For a set point outside the body's range (`minSetPoint` to `maxSetPoint`),
`setSetPoint()` and `setSolarSetPoint()` throw `OmniValidationError` and send
nothing. In heat mode, the controller raises the solar set point to match a
higher set point. `setMode()` takes the `HEATER_MODE` code (0 heat, 1 cool, 2
auto) and throws `OmniValidationError` for any other. `mode` is "Off" when the
controller reports thermostat mode 3. The panel never sets that mode.

Each remaining setting has a setter. `cooldown`, `extend`, `allowLowSpeed`, and
`lowSpeed` are getters that read the configuration. `silentMode` is a getter
that reads telemetry. `autoDifferential()` is an `async` method that asks the
controller.

### Heat sources

`heater` is the body's thermostat. There is one per body. It holds the set
point, the mode, and whether the body calls for heat. The heat sources it calls
on, such as a gas heater, a heat pump, or a solar loop, are in
`heater.appliances`. Each has its own `enabled` setting, rank, and temperature
reading.

```typescript
const [gas, solar] = omni.backyard.pool?.heater?.appliances ?? [];

// "HTR_GAS"
gas?.type;
// false, so the thermostat does not call on it
gas?.enabled;
// "Priority 2", its rank against the body's other sources
gas?.priority;
// hours the body waits for this one before starting the next
gas?.maintainFor;
// what this one is doing: "Off", "On", "Pause", or "Cool Down"
solar?.status;
// the temperature at its own sensor, or undefined with no reading
solar?.temp;
// true on a source that can cool as well as heat
solar?.supportsCooling;

await solar?.setEnabled(true);
await solar?.setPriority(0);
```

`setPriority()` takes the code, not the label. Codes 0 through 4 are the ranks
that the panel shows as 1 through 5. Code 254 is the panel's "prioritize the use
of solar heating/cooling". It puts solar ahead of every other heat source. The
SDK accepts it only for a solar loop. Any other value throws
`OmniValidationError`.

With a `maintainFor` of 0, every heat source runs together, with no ranking.
With a `maintainFor` of 24, the body waits until this heat source can no longer
run before it starts the next. It does not mean a full day. The SDK has no
setter for it. You set it in the panel's configuration wizard.

`setPriority()` is not verified on hardware. After you call it, call `refresh()`
and read `priority`.

A heat source shared with another body has a record on each body, with its own
`enabled` setting and rank. Its `sharedWith` holds the system id of its record
on the other body, or -1 when it is not shared. If you disable it on one body,
only the thermostat on that body stops calling on it.

`applianceState`, `allowLowSpeed`, `setAllowLowSpeed()`, `lowSpeed`, and
`setLowSpeed()` on the thermostat act on the first heat source only. This is
correct for a body with one heat source.

## The chlorinator

```typescript
// true
omni.backyard.pool?.chlorinator?.enabled;
// 15
omni.backyard.pool?.chlorinator?.timedPercent;
// false
omni.backyard.pool?.chlorinator?.isSuperchlorinating;
// "Off", "Paused", or "Generating"
omni.backyard.pool?.chlorinator?.operatingState;
// "Timed" when the clock decides, "ORP Auto" when the ORP reading does
omni.backyard.pool?.chlorinator?.operatingMode;
// every condition the cell reports at once: "Generating, K1 Active"
omni.backyard.pool?.chlorinator?.conditions;
// what the cell is warning about: "Low Salt, Clean Cell" or "None"
omni.backyard.pool?.chlorinator?.alert;
// the faults it reports: "Relay K1 Open" or "None"
omni.backyard.pool?.chlorinator?.error;
// ppm
omni.backyard.pool?.chlorinator?.averageSalt;
omni.backyard.pool?.chlorinator?.instantSalt;

await omni.backyard.pool?.chlorinator?.setTimedPercent(20);
// for superchlorinateHours
await omni.backyard.pool?.chlorinator?.superchlorinate();
// 1440
console.log(
  await omni.backyard.pool?.chlorinator?.superchlorinateMinutesRemaining(),
);
await omni.backyard.pool?.chlorinator?.superchlorinate(false);
```

When you turn superchlorination off, the filter pump also stops. After that, set
the filter speed again.

The cell's diagnostics, `cellStatus()`, `cellMeasurement()`, and
`relayPolarity()`, return readings that the configuration and telemetry do not
have:

- whether a feeder is dispensing
- the cell's voltage, current, and temperature
- the relay polarity

Each one asks the cell over the controller's bus. Call them only when a person
asks for the value. Do not poll them.

## Lights

A body's `lights` list has one entry for each light in the configuration, in the
controller's order. OmniDirect is a light mode that adds colors, a show speed,
and a brightness.

```typescript
import { ColorLogicShow } from "@rygine/omnilogic-local-sdk";

// false
omni.backyard.pool?.lights[0]?.isOn;
// "DEEP_BLUE_SEA"
omni.backyard.pool?.lights[0]?.show;
// "OFF", "ACTIVE", or a step between them such as "COOLDOWN"
omni.backyard.pool?.lights[0]?.powerState;
// true when the light is in OmniDirect mode, with its extra colors
omni.backyard.pool?.lights[0]?.omniDirect;
// every show and color the light offers
omni.backyard.pool?.lights[0]?.shows;

await omni.backyard.pool?.lights[0]?.on();
await omni.backyard.pool?.lights[0]?.setShow(ColorLogicShow.TWILIGHT);
await omni.backyard.pool?.lights[0]?.off();
```

`setShow` keeps the current speed and brightness unless you pass new ones.

```typescript
import { ColorLogicShow } from "@rygine/omnilogic-local-sdk";

// "1x", from "1/16x" to "16x"
omni.backyard.pool?.lights[0]?.speed;
// 100, from 20 to 100 in steps of 20
omni.backyard.pool?.lights[0]?.brightness;

await omni.backyard.pool?.lights[0]?.setShow(ColorLogicShow.MARDI_GRAS, {
  speed: "2x",
  brightness: 60,
});
```

A solid color ignores the speed. `setShow` throws `OmniValidationError`, and
does not send the show, for:

- a speed or brightness that the light has no step for
- a speed or brightness on a light that is not in OmniDirect mode
- a show that the light does not offer, unless you pass `{ force: true }`

A light ignores commands while it changes show or powers down. For this reason,
`on`, `off`, and `setShow` do these steps:

1. Wait up to a minute for the light to settle.
2. Send the command.
3. Refresh for up to 30 seconds until the light reports the new state.

A light that never settles throws `OmniTimeoutError`. A new state that never
appears throws `CommandFailedError`. Each method takes
`{ attempts, timeoutMs, pollMs }`. With `{ wait: false }`, the method does not
wait. If the light is not settled, it throws `OmniValidationError`.

## Relays

A relay switches a circuit for a blower, a light, a valve actuator, or other
equipment. A body's `relays` lists them in the controller's order. Every relay
has the same getters and methods, whatever is connected to it.

`type` names the kind of relay, and `function` names what it drives. Both use
the controller's words, for example a `RLY_HIGH_VOLTAGE_RELAY` whose function is
`RLY_BLOWER`, or a `RLY_VALVE_ACTUATOR` whose function is `RLY_WATER_FEATURE`. A
light that cannot run shows is a relay with a light function, not an entry in
`lights`.

```typescript
// "Blower"
omni.backyard.spa?.relays[0]?.name;
// false
omni.backyard.spa?.relays[0]?.isOn;
// true while it runs on a countdown
omni.backyard.spa?.relays[0]?.onCountdown;
// why it is on or off: "Manual On", "Schedule On", "Interlock"…
omni.backyard.spa?.relays[0]?.whyOn;

await omni.backyard.spa?.relays[0]?.on();
// on, then off in 30 minutes
await omni.backyard.spa?.relays[0]?.setCountdownTime(30);
// 29
console.log(await omni.backyard.spa?.relays[0]?.remainingCountdownTime());
await omni.backyard.spa?.relays[0]?.off();

// "RLY_HIGH_VOLTAGE_RELAY"
omni.backyard.spa?.relays[0]?.type;
// a smart valve actuator's target, undefined on other relays
omni.backyard.spa?.relays[0]?.smartValveTarget;
// the filter speed this feature sets, undefined when it sets none
omni.backyard.spa?.relays[0]?.valveDefaultSpeed;
// "RLY_BLOWER"
omni.backyard.spa?.relays[0]?.function;
// "On", "Off", "Paused", "Waiting For Interlock"…
omni.backyard.spa?.relays[0]?.status;
```

The SDK has no method that picks relays by `function`. To find the relays that
drive lights, filter on it:

```typescript
const { relays } = omni.backyard;
const lights = relays.filter((r) => r.function.endsWith("LIGHT"));
```

## Chemistry

A Sense and Dispense module measures pH and ORP (oxidation-reduction potential)
and adds a pH reducer to keep the pH at its target. The body's `csad` is the
module, or `undefined` when there is none.

```typescript
const chem = omni.backyard.pool?.csad;

// 7.3, or undefined with no reading
chem?.ph;
// 720 mV, or undefined with no reading
chem?.orp;
// "Off", "Auto", "Forced On", "Monitoring", or "Dispense Off"
chem?.mode;
// true while the reducer is running
chem?.isDispensing;

// "ACID" or "CO2", and the settings the module holds
chem?.type;
chem?.phTarget;
chem?.phLowAlarm;
chem?.phHighAlarm;
chem?.orpTarget;

await chem?.setPhTarget(7.4);
await chem?.setOrpTarget(650);
```

The controller takes a pH target from 7.0 to 8.0, in steps of 0.1. It takes an
ORP target from 400 to 900 mV, in steps of 5. For a value outside that range or
between two steps, the setter throws `OmniValidationError` and sends nothing.

`ph` is the reading as the controller reports it. `phCalibration` is the
difference between a tested sample and what the module displays. The SDK does
not apply it. It is not known whether `ph` already includes it.

No chemistry command is verified on hardware. A new target changes how much pH
reducer the module adds. After you set a target, call `refresh()` and read the
value again.

## The panel

The panel is the controller's display and keypad. Settings for the whole
controller are on `omni.backyard.panel`. Each has a setter. `vspSpeedFormat`,
`chlorinatorDisplay`, and `timeFormat` are getters that read the configuration.
The others have an `async` method that asks the controller.

```typescript
// "Standard" or "Metric" on the panel, the SDK always uses °F
console.log(await omni.backyard.panel.units());
await omni.backyard.panel.setBeeper(false);
await omni.backyard.panel.setBackLightBrightness(50);
// used for sunrise and sunset schedules
await omni.backyard.panel.setCoordinates(30.0, -90.1);
```

The panel also has `backLight` and `backLightTimeout`.

`vspSpeedFormat` controls how the panel shows a pump speed. It does not change
what the controller reports. Telemetry gives a percent for both settings.

## Spillover

On a pool and spa that share a pump, spillover runs the pump and moves the
return valve.

```typescript
// the valves are in the spillover position now
omni.backyard.pool?.spilloverOn;
// the filter pump runs on a spillover countdown
omni.backyard.pool?.spilloverOnCountdown;
// whether spillover is enabled at all
omni.backyard.pool?.spilloverEnabled;
await omni.backyard.pool?.setSpilloverEnabled(false);
```
