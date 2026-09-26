---
opcode: 153
area: heater
status: verified
summary: Sets whether a heat source may run while the pump is at low speed.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetHeaterAllowedLowSpeed

<CommandFacts />

Sets whether a heat source may run while the pump is at low speed.

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
await omni.command("SetHeaterAllowedLowSpeed", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetHeaterAllowedLowSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
