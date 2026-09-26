---
opcode: 309
area: equipment
status: unverified
summary:
  "Re-synchronizes a group of standalone ColorLogic lights, which then restart
  on Voodoo Lounge, as the panel's Synchronize button does."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# ResetStandAloneLight

<CommandFacts />

Re-synchronizes a group of standalone ColorLogic lights, which then restart on
Voodoo Lounge, as the panel's Synchronize button does.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("ResetStandAloneLight", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>ResetStandAloneLight</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
