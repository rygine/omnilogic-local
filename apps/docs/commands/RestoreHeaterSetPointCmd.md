---
opcode: 316
area: heater
status: unverified
summary: >-
  Clears every temporary override on the body's heater: set point, solar set
  point, mode, and silent mode.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# RestoreHeaterSetPointCmd

<CommandFacts />

Clears every temporary override on the body's heater: set point, solar set
point, mode, and silent mode.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("RestoreHeaterSetPointCmd", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>RestoreHeaterSetPointCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
