---
opcode: 311
area: equipment
status: verified
summary:
  "Turns spillover on at a filter speed, or off, with an optional countdown."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUISpilloverCmd

<CommandFacts />

Turns spillover on at a filter speed, or off, with an optional countdown. On a
pool and spa that share a pump, `poolId` is the pool's system id. Both filter
rows then report valve position 3, and the pool's row reports the reason "Manual
Spillover".

## Parameters

| name               | type | notes                               |
| ------------------ | ---- | ----------------------------------- |
| `poolId`           | int  | the pool of a shared pair           |
| `data`             | int  | the filter speed percent, 0 for off |
| `isCountDownTimer` | byte |                                     |
| `startTimeHours`   | byte |                                     |
| `startTimeMinutes` | byte |                                     |
| `endTimeHours`     | byte |                                     |
| `endTimeMinutes`   | byte |                                     |
| `daysActive`       | byte |                                     |
| `recurring`        | byte |                                     |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
import { timerParams } from "@rygine/omnilogic-local-sdk";

await omni.command("SetUISpilloverCmd", {
  poolId: 1,
  data: 0,
  ...timerParams(),
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUISpilloverCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
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
