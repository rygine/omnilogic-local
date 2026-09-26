---
opcode: 307
area: heater
status: verified
summary: >-
  Reads the body's heating state in one reply: whether the heater is on, its set
  point, and the water temperature.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIHeaterStatus

<CommandFacts />

Reads the body's heating state in one reply: whether the heater is on, its set
point, and the water temperature.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1307" />

`GetUIHeaterStatusRsp`

| name            | type | unit |
| --------------- | ---- | ---- |
| `poolId`        | int  |      |
| `heaterId`      | int  |      |
| `isHeaterIsOn`  | byte |      |
| `whyHeaterIsOn` | byte |      |
| `currentTemp`   | byte |      |
| `setTemp`       | byte |      |

## Example

```typescript
const reply = await omni.command("GetUIHeaterStatus", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIHeaterStatus</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">4</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIHeaterStatusRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">4</Parameter>
    <Parameter name="IsHeaterIsOn" dataType="byte">0</Parameter>
    <Parameter name="WhyHeaterIsOn" dataType="byte">1</Parameter>
    <Parameter name="CurrentTemp" dataType="byte">92</Parameter>
    <Parameter name="SetTemp" dataType="byte">94</Parameter>
  </Parameters>
</Response>
```
