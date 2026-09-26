---
opcode: 308
area: equipment
status: verified
summary: "Runs a show on a ColorLogic light, optionally on a timer."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetStandAloneLightShow

<CommandFacts />

Runs a show on a ColorLogic light, optionally on a timer.

## Parameters

| name               | type | notes                                                               |
| ------------------ | ---- | ------------------------------------------------------------------- |
| `poolId`           | int  |                                                                     |
| `equipmentId`      | int  |                                                                     |
| `data`             | byte | the show number, from the light's show list                         |
| `field19`          | byte | the speed on an OmniDirect light: 0 to 8 for 1/16x to 16x           |
| `field1a`          | byte | the brightness on an OmniDirect light: 0 to 4 for 20 to 100 percent |
| `field1b`          | byte | 0                                                                   |
| `isCountDownTimer` | byte |                                                                     |
| `startTimeHours`   | byte |                                                                     |
| `startTimeMinutes` | byte |                                                                     |
| `endTimeHours`     | byte |                                                                     |
| `endTimeMinutes`   | byte |                                                                     |
| `daysActive`       | byte |                                                                     |
| `recurring`        | byte |                                                                     |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
import { timerParams } from "@rygine/omnilogic-local-sdk";

await omni.command("SetStandAloneLightShow", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  field19: 0,
  field1a: 0,
  field1b: 0,
  ...timerParams(),
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetStandAloneLightShow</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="byte">0</Parameter>
    <Parameter name="field19" dataType="byte">0</Parameter>
    <Parameter name="field1a" dataType="byte">0</Parameter>
    <Parameter name="field1b" dataType="byte">0</Parameter>
    <Parameter name="isCountDownTimer" dataType="byte">0</Parameter>
    <Parameter name="startTimeHours" dataType="byte">0</Parameter>
    <Parameter name="startTimeMinutes" dataType="byte">0</Parameter>
    <Parameter name="endTimeHours" dataType="byte">0</Parameter>
    <Parameter name="endTimeMinutes" dataType="byte">0</Parameter>
    <Parameter name="daysActive" dataType="byte">0</Parameter>
    <Parameter name="recurring" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
