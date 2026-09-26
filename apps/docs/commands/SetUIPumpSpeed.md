---
opcode: 380
area: equipment
status: unverified
summary:
  "Sets the speed of a cleaner's, water feature's, or accessory's own pump. The
  controller rejects it for any other equipment type."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIPumpSpeed

<CommandFacts />

Sets the speed of a cleaner's, water feature's, or accessory's own pump. The
controller rejects it for any other equipment type.

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
await omni.command("SetUIPumpSpeed", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIPumpSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
