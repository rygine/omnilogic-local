---
opcode: 137
area: equipment
status: verified
summary: Enables or disables freeze protection on the body's filter pump.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetFreezeProtect

<CommandFacts />

Enables or disables freeze protection on the body's filter pump.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetFreezeProtect", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetFreezeProtect</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
