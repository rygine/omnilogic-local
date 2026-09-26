---
opcode: 20
area: chlorinator
status: unusable
summary: "Reads the superchlorinate output level."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUISuperCHLOROutputCmd

<CommandFacts />

Reads the superchlorinate output level.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

None. The controller acknowledges the command and discards it.

## Example

```typescript
await omni.command("GetUISuperCHLOROutputCmd", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUISuperCHLOROutputCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">6</Parameter>
  </Parameters>
</Request>
```

## Response XML

None. The controller acknowledges the command and discards it.
