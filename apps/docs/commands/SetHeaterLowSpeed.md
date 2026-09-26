---
opcode: 358
area: heater
status: verified
summary: >-
  Sets the minimum pump speed the heater requires, within the filter pump's
  operating range.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetHeaterLowSpeed

<CommandFacts />

Sets the minimum pump speed the heater requires, within the filter pump's
operating range.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetHeaterLowSpeed", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetHeaterLowSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
