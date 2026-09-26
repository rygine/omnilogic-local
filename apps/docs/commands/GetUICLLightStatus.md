---
opcode: 199
area: diagnostics
status: verified
summary: >-
  Reads a ColorLogic light's state, why it is on, its show, speed, brightness,
  and special effect.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUICLLightStatus

<CommandFacts />

Reads a ColorLogic light's state, why it is on, its show, speed, brightness, and
special effect.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1199" />

`GetUICLLightStatusRsp`

| name            | type | unit |
| --------------- | ---- | ---- |
| `poolId`        | int  |      |
| `colorLogicId`  | int  |      |
| `lightState`    | byte |      |
| `whyLightIsOn`  | byte |      |
| `currentShow`   | byte |      |
| `speed`         | byte |      |
| `brightness`    | byte |      |
| `specialEffect` | byte |      |

## Example

```typescript
const reply = await omni.command("GetUICLLightStatus", {
  poolId: 1,
  equipmentId: 8,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUICLLightStatus</Name>
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
  <Name>GetUICLLightStatusRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ColorLogicID" dataType="int">8</Parameter>
    <Parameter name="LightState" dataType="byte">0</Parameter>
    <Parameter name="WhyLightIsOn" dataType="byte">0</Parameter>
    <Parameter name="CurrentShow" dataType="byte">0</Parameter>
    <Parameter name="Speed" dataType="byte">4</Parameter>
    <Parameter name="Brightness" dataType="byte">4</Parameter>
    <Parameter name="SpecialEffect" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
