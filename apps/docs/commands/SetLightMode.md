---
opcode: 223
area: equipment
status: unverified
summary:
  "Sets which kind of ColorLogic light the controller drives: Universal
  ColorLogic, ColorLogic 4.0, 2.5, or Pentair SAM. This matches the panel's
  Light Mode button."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetLightMode

<CommandFacts />

Sets which kind of ColorLogic light the controller drives: Universal ColorLogic,
ColorLogic 4.0, 2.5, or Pentair SAM. This matches the panel's Light Mode button.

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
await omni.command("SetLightMode", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetLightMode</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
