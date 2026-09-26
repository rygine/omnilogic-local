---
opcode: 384
area: equipment
status: verified
summary: Sets how long a freeze-protection override lasts.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIFreezeProtectOverrideInterval

<CommandFacts />

Sets how long a freeze-protection override lasts.

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
await omni.command("SetUIFreezeProtectOverrideInterval", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIFreezeProtectOverrideInterval</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
