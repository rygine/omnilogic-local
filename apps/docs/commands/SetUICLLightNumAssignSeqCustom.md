---
opcode: 207
area: equipment
status: unverified
summary:
  "Sends a networked ColorLogic light its stored number and sequence place for
  the custom shows, a network-module feature Omni controllers do not offer."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUICLLightNumAssignSeqCustom

<CommandFacts />

Sends a networked ColorLogic light its stored number and sequence place for the
custom shows, a network-module feature Omni controllers do not offer.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUICLLightNumAssignSeqCustom", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUICLLightNumAssignSeqCustom</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
