---
opcode: 62
area: equipment
status: unverified
summary:
  Sets a smart valve's target. It is the same generic write as
  SetUIEquipmentCmd.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUISmartValveTargetCmd

<CommandFacts />

Sets a smart valve's target. It is the same generic write as
[SetUIEquipmentCmd](/commands/SetUIEquipmentCmd).

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
await omni.command("SetUISmartValveTargetCmd", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUISmartValveTargetCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
