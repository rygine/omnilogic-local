---
opcode: 127
area: equipment
status: verified
summary: Enables or disables spillover on the body.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetSpaSpilloverEnable

<CommandFacts />

Enables or disables spillover on the body.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetSpaSpilloverEnable", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetSpaSpilloverEnable</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
