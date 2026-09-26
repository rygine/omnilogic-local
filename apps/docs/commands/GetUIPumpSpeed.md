---
opcode: 381
area: equipment
status: unverified
summary:
  "Reads the speed of a cleaner's, water feature's, or accessory's own pump. The
  controller is silent on a body with none of those."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIPumpSpeed

<CommandFacts />

Reads the speed of a cleaner's, water feature's, or accessory's own pump. The
controller is silent on a body with none of those.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetUIPumpSpeed", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIPumpSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
