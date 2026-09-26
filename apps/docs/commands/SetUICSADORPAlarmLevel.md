---
opcode: 283
area: csad
status: unverified
summary:
  "Sets a Sense and Dispense module's two ORP alarm levels, 850 mV high and 350
  mV low by default. A high ORP also stops chlorine generation."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUICSADORPAlarmLevel

<CommandFacts />

Sets a Sense and Dispense module's two ORP alarm levels, 850 mV high and 350 mV
low by default. A high ORP also stops chlorine generation.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |
| `field1c`     | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUICSADORPAlarmLevel", {
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
  <Name>SetUICSADORPAlarmLevel</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="field1c" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
