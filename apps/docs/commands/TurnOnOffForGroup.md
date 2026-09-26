---
opcode: 322
area: themes
status: verified
summary: "Turns a theme, or a piece of equipment, on or off."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# TurnOnOffForGroup

<CommandFacts />

Turns a theme, or a piece of equipment, on or off.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |
| `field1c`     | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("TurnOnOffForGroup", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  field1c: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>TurnOnOffForGroup</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="field1c" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
