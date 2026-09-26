---
opcode: 121
area: chlorinator
status: verified
summary: Enables or disables the body's chlorinator.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetCHLOREnable

<CommandFacts />

Enables or disables the body's chlorinator.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetCHLOREnable", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetCHLOREnable</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
