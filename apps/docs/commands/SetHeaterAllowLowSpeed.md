---
opcode: 356
area: heater
status: unverified
summary: >-
  Sets whether the heater may run with the pump at low speed. Identical to
  SetHeaterAllowedLowSpeed.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetHeaterAllowLowSpeed

<CommandFacts />

Sets whether the heater may run with the pump at low speed. Identical to
[SetHeaterAllowedLowSpeed](/commands/SetHeaterAllowedLowSpeed).

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
await omni.command("SetHeaterAllowLowSpeed", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetHeaterAllowLowSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
