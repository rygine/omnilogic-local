---
opcode: 317
area: themes
status: verified
summary:
  Runs a theme's saved snapshot with data 1, or turns off every device in it
  with data 0. With isCountDownTimer 1 and an end time, the controller turns it
  off when the time is up.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# RunGroupCmd

<CommandFacts />

Runs a theme's saved snapshot with `data` 1, or turns off every device in it
with `data` 0. With `isCountDownTimer` 1 and an end time, the controller turns
it off when the time is up.

## Parameters

| name               | type | notes |
| ------------------ | ---- | ----- |
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

await omni.command("RunGroupCmd", {
  equipmentId: 1,
  data: 1,
  ...timerParams(),
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>RunGroupCmd</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">1</Parameter>
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
