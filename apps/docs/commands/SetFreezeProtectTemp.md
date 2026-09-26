---
opcode: 141
area: equipment
status: verified
summary: "Sets the freeze-protection temperature threshold, at most 42 °F."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetFreezeProtectTemp

<CommandFacts />

Sets the freeze-protection temperature threshold, at most 42 °F.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetFreezeProtectTemp", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetFreezeProtectTemp</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
