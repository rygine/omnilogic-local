# Inventory

Before `command()` sends a command that needs a piece of equipment, it checks
the configuration. If the configuration shows that the equipment is not
installed on the body of water (the pool or the spa) you addressed, `command()`
refuses with `EquipmentNotInstalledError`.

```typescript
import { EquipmentNotInstalledError } from "@rygine/omnilogic-local-sdk";

try {
  await omni.command("SetHeaterEnable", {
    poolId: 2,
    equipmentId: 11,
    data: 1,
  });
} catch (e) {
  if (e instanceof EquipmentNotInstalledError) {
    // "heater" 2
    console.log(e.requirement, e.poolId);
  }
}
```

`command()` also refuses when `poolId` names no body of water in the
configuration. Then `requirement` is `"body"`.

Some commands need the id of the heater's heat source or the chlorinator's cell.
If you pass the id of the heater or the chlorinator itself, `command()` refuses
the command.

## Discovering equipment

```typescript
await omni.refresh();
// { installed: true, systemId: 3, vsp: true }
omni.inventory.bodies[0].filter;
// true or false
omni.inventory.bodies[0].heater.installed;
omni.inventory.bodies[0].chlorinator.installed;
omni.inventory.bodies[0].light.installed;
omni.inventory.bodies[0].blower.installed;
// csad is the Sense and Dispense module
omni.inventory.bodies[0].csad.installed;
// true when the body shares its filter pump with another body
omni.inventory.bodies[0].spillover;
// the body's first light
// { installed: true, systemId: 8, networked: false }
// networked is true only for a light behind a ColorLogic network module
omni.inventory.bodies[0].light;
```

Three fields say what a device can do. Each is `false` only when the
configuration names a type that the SDK knows lacks the feature:

- `filter.vsp` is `false` for a single-speed or dual-speed filter pump.
- `heater.gas` is `false` when every heat source is a type the SDK knows is not
  gas, such as a heat pump or solar.
- `chlorinator.cell.feeder` is `false` for a salt cell.

For a type the SDK does not recognize, the field is `true`, so `command()` does
not refuse on a guess.

The networked ColorLogic commands, such as `SetUICLAllFindLightsStart`, need a
light behind a ColorLogic network module. Omni controllers run their lights
standalone. `command()` refuses these commands unless the configuration shows
the light as networked. When the light is not networked, `requirement` is
`"light.networked"`.

## Skipping the check

If the check refuses a command that your equipment can run, `{ force: true }`
skips the check.

```typescript
await omni.command(
  "SetHeaterEnable",
  { poolId: 2, equipmentId: 11, data: 1 },
  { force: true },
);
```
