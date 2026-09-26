---
opcode: 400
area: heater
status: unverified
summary: >-
  Turns a body's heating on or off, but does not change the controller's
  configuration.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUITemporaryHeaterEnable

<CommandFacts />

Turns a body's heating on or off, but does not change the controller's
configuration.

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
await omni.command("SetUITemporaryHeaterEnable", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUITemporaryHeaterEnable</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
