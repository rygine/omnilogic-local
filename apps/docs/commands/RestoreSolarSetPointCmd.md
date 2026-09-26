---
opcode: 335
area: system
status: unverified
summary: Restores the body's solar set point to its configured value.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# RestoreSolarSetPointCmd

<CommandFacts />

Restores the body's solar set point to its configured value.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("RestoreSolarSetPointCmd", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>RestoreSolarSetPointCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
