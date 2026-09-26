---
opcode: 163
area: chlorinator
status: verified
summary: >-
  Reads the salt cell's electrical diagnostics: voltage, current, cell and board
  temperature, instant salt.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCHLORMeasurement

<CommandFacts />

Reads the salt cell's electrical diagnostics: voltage, current, cell and board
temperature, instant salt.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1163" />

`GetCHLORMeasurementRsp`

| name                       | type | unit |
| -------------------------- | ---- | ---- |
| `poolId`                   | int  |      |
| `chlorId`                  | int  |      |
| `voltageHighByte`          | byte |      |
| `voltageLowByte`           | byte |      |
| `currentHighByte`          | byte |      |
| `currentLowByte`           | byte |      |
| `cellTempHighByte`         | byte |      |
| `cellTempLowByte`          | byte |      |
| `boardTempHighByte`        | byte |      |
| `boardTempLowByte`         | byte |      |
| `instantSaltLevelHighByte` | byte |      |
| `instantSaltLevelLowByte`  | byte |      |
| `averageSaltLevelHighByte` | byte |      |
| `averageSaltLevelLowByte`  | byte |      |

## Example

```typescript
const reply = await omni.command("GetCHLORMeasurement", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORMeasurement</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">6</Parameter>
  </Parameters>
</Request>
```

## Response XML

Captured with the pump off and the cell idle.

```xml
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORMeasurementRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">7</Parameter>
    <Parameter name="VoltageHighByte" dataType="byte">0</Parameter>
    <Parameter name="VoltageLowByte" dataType="byte">202</Parameter>
    <Parameter name="CurrentHighByte" dataType="byte">0</Parameter>
    <Parameter name="CurrentLowByte" dataType="byte">0</Parameter>
    <Parameter name="CellTempHighByte" dataType="byte">1</Parameter>
    <Parameter name="CellTempLowByte" dataType="byte">172</Parameter>
    <Parameter name="BoardTempHighByte" dataType="byte">0</Parameter>
    <Parameter name="BoardTempLowByte" dataType="byte">221</Parameter>
    <Parameter name="InstantSaltLevelHighByte" dataType="byte">11</Parameter>
    <Parameter name="InstantSaltLevelLowByte" dataType="byte">176</Parameter>
    <Parameter name="AverageSaltLevelHighByte" dataType="byte">12</Parameter>
    <Parameter name="AverageSaltLevelLowByte" dataType="byte">145</Parameter>
  </Parameters>
</Response>
```
