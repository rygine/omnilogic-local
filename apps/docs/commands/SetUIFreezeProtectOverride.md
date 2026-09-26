---
opcode: 382
area: equipment
status: unverified
summary:
  "Starts or ends a freeze-protection override for the configured interval. The
  panel offers 60, 120, or 180 minutes."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIFreezeProtectOverride

<CommandFacts />

Starts or ends a freeze-protection override for the configured interval. The
panel offers 60, 120, or 180 minutes.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUIFreezeProtectOverride", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIFreezeProtectOverride</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
