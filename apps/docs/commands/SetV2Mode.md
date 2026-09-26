---
opcode: 225
area: system
status: unverified
summary:
  "Switches a Universal ColorLogic light into OmniDirect mode, which adds speed
  and brightness control and 27 shows and colors."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetV2Mode

<CommandFacts />

Switches a Universal ColorLogic light into OmniDirect mode, which adds speed and
brightness control and 27 shows and colors.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetV2Mode", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetV2Mode</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
