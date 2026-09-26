---
opcode: 310
area: equipment
status: verified
summary:
  "Reads a ColorLogic light's show, speed, brightness, and special effect."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetStandAloneLightShow

<CommandFacts />

Reads a ColorLogic light's show, speed, brightness, and special effect.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1310" />

`GetStandAloneLightShowRsp`

| name            | type | unit |
| --------------- | ---- | ---- |
| `poolId`        | int  |      |
| `lightId`       | int  |      |
| `show`          | int  |      |
| `speed`         | int  |      |
| `brightness`    | int  |      |
| `specialEffect` | int  |      |

## Example

```typescript
const reply = await omni.command("GetStandAloneLightShow", {
  poolId: 1,
  equipmentId: 8,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetStandAloneLightShow</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">8</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetStandAloneLightShowRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="LightID" dataType="int">8</Parameter>
    <Parameter name="Show" dataType="int">0</Parameter>
    <Parameter name="Speed" dataType="int">4</Parameter>
    <Parameter name="Brightness" dataType="int">4</Parameter>
    <Parameter name="SpecialEffect" dataType="int">0</Parameter>
  </Parameters>
</Response>
```
