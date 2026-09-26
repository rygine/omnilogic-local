---
opcode: 6
area: equipment
status: unverified
summary: Moves the pool and spa valve to the requested position.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIPoolSpaSpilloverCmd

<CommandFacts />

Moves the pool and spa valve to the requested position.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUIPoolSpaSpilloverCmd", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIPoolSpaSpilloverCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
