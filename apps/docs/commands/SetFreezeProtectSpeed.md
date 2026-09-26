---
opcode: 139
area: equipment
status: verified
summary: >-
  Sets the speed the filter pump runs at under freeze protection, at most the
  pump's high speed.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetFreezeProtectSpeed

<CommandFacts />

Sets the speed the filter pump runs at under freeze protection, at most the
pump's high speed.

## Parameters

| name     | type | notes |
| -------- | ---- | ----- |
| `poolId` | int  |       |
| `data`   | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetFreezeProtectSpeed", {
  poolId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetFreezeProtectSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
