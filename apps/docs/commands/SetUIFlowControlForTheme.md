---
opcode: 69
area: themes
status: unverified
summary: What this command does is not known.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIFlowControlForTheme

<CommandFacts />

What this command does is not known.

## Parameters

| name               | type | notes |
| ------------------ | ---- | ----- |
| `poolId`           | int  |       |
| `equipmentId`      | int  |       |
| `data`             | byte |       |
| `field19`          | byte |       |
| `field1a`          | byte |       |
| `field1b`          | byte |       |
| `field1c`          | byte |       |
| `field1d`          | byte |       |
| `field1e`          | byte |       |
| `field1f`          | byte |       |
| `isCountDownTimer` | byte |       |
| `startTimeMinutes` | byte |       |
| `startTimeHours`   | byte |       |
| `endTimeMinutes`   | byte |       |
| `endTimeHours`     | byte |       |
| `daysActive`       | byte |       |
| `recurring`        | byte |       |
| `field27`          | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
import { timerParams } from "@rygine/omnilogic-local-sdk";

await omni.command("SetUIFlowControlForTheme", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  field19: 0,
  field1a: 0,
  field1b: 0,
  field1c: 0,
  field1d: 0,
  field1e: 0,
  field1f: 0,
  field27: 0,
  ...timerParams(),
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIFlowControlForTheme</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="byte">0</Parameter>
    <Parameter name="field19" dataType="byte">0</Parameter>
    <Parameter name="field1a" dataType="byte">0</Parameter>
    <Parameter name="field1b" dataType="byte">0</Parameter>
    <Parameter name="field1c" dataType="byte">0</Parameter>
    <Parameter name="field1d" dataType="byte">0</Parameter>
    <Parameter name="field1e" dataType="byte">0</Parameter>
    <Parameter name="field1f" dataType="byte">0</Parameter>
    <Parameter name="isCountDownTimer" dataType="byte">0</Parameter>
    <Parameter name="startTimeMinutes" dataType="byte">0</Parameter>
    <Parameter name="startTimeHours" dataType="byte">0</Parameter>
    <Parameter name="endTimeMinutes" dataType="byte">0</Parameter>
    <Parameter name="endTimeHours" dataType="byte">0</Parameter>
    <Parameter name="daysActive" dataType="byte">0</Parameter>
    <Parameter name="recurring" dataType="byte">0</Parameter>
    <Parameter name="field27" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
