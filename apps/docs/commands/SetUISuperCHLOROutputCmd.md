---
opcode: 19
area: chlorinator
status: unusable
summary: "Sets the superchlorinate output level."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUISuperCHLOROutputCmd

<CommandFacts />

Sets the superchlorinate output level.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |

## Reply

None. The controller acknowledges the command and discards it.

## Example

```typescript
await omni.command("SetUISuperCHLOROutputCmd", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUISuperCHLOROutputCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None. The controller acknowledges the command and discards it.
