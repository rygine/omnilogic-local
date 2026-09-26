---
opcode: 334
area: schedules
status: unverified
summary: Schedules a solar heater window for the body.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetSolarScheduleCmd

<CommandFacts />

Schedules a solar heater window for the body.

## Parameters

| name               | type | notes |
| ------------------ | ---- | ----- |
| `poolId`           | int  |       |
| `equipmentId`      | int  |       |
| `data`             | int  |       |
| `isCountDownTimer` | byte |       |
| `startTimeHours`   | byte |       |
| `startTimeMinutes` | byte |       |
| `endTimeHours`     | byte |       |
| `endTimeMinutes`   | byte |       |
| `daysActive`       | byte |       |
| `recurring`        | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
import { timerParams } from "@rygine/omnilogic-local-sdk";

await omni.command("SetSolarScheduleCmd", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  ...timerParams(),
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetSolarScheduleCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
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
