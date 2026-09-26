---
opcode: 402
area: heater
status: unverified
summary: >-
  Sets, per rank, how long a heat source keeps the lead in a temporary priority
  order.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUITemporaryHeaterMaintainPriorityCmd

<CommandFacts />

Sets, per rank, how long a heat source keeps the lead in a temporary priority
order.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | byte |       |
| `field19`     | byte |       |
| `field1a`     | byte |       |
| `field1b`     | byte |       |
| `field1c`     | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUITemporaryHeaterMaintainPriorityCmd", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  field19: 0,
  field1a: 0,
  field1b: 0,
  field1c: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUITemporaryHeaterMaintainPriorityCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="byte">0</Parameter>
    <Parameter name="field19" dataType="byte">0</Parameter>
    <Parameter name="field1a" dataType="byte">0</Parameter>
    <Parameter name="field1b" dataType="byte">0</Parameter>
    <Parameter name="field1c" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
