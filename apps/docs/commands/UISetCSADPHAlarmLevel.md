---
opcode: 257
area: csad
status: unverified
summary:
  "Sets a Sense and Dispense module's two pH alarm levels, 8.1 high and 6.9 low
  by default. Which parameter sets which is not known."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADPHAlarmLevel

<CommandFacts />

Sets a Sense and Dispense module's two pH alarm levels, 8.1 high and 6.9 low by
default. Which parameter sets which is not known.

## Parameters

| name          | type  | notes |
| ------------- | ----- | ----- |
| `poolId`      | int   |       |
| `equipmentId` | int   |       |
| `data`        | float |       |
| `field1c`     | float |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("UISetCSADPHAlarmLevel", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  field1c: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADPHAlarmLevel</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="float">0</Parameter>
    <Parameter name="field1c" dataType="float">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
