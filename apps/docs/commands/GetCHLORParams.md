---
opcode: 156
area: chlorinator
status: verified
summary: >-
  Reads the chlorinator's configuration in one reply: state, mode, body and cell
  type, timed percent, superchlorinate and ORP timeouts.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCHLORParams

<CommandFacts />

Reads the chlorinator's configuration in one reply: state, mode, body and cell
type, timed percent, superchlorinate and ORP timeouts.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1156" />

`GetCHLORParamsRsp`

| name           | type | unit |
| -------------- | ---- | ---- |
| `poolId`       | int  |      |
| `chlorId`      | int  |      |
| `cfgState`     | byte |      |
| `opMode`       | byte |      |
| `bowType`      | byte |      |
| `cellType`     | byte |      |
| `timedPercent` | byte |      |
| `scTimeout`    | byte | hour |
| `orpTimeout`   | byte | hour |

## Example

```typescript
const reply = await omni.command("GetCHLORParams", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORParams</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">6</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORParamsRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">6</Parameter>
    <Parameter name="CfgState" dataType="byte">3</Parameter>
    <Parameter name="OpMode" dataType="byte">1</Parameter>
    <Parameter name="BOWType" dataType="byte">0</Parameter>
    <Parameter name="CellType" dataType="byte">8</Parameter>
    <Parameter name="TimedPercent" dataType="byte">15</Parameter>
    <Parameter name="SCTimeout" dataType="byte" unit="hour">1</Parameter>
    <Parameter name="ORPTimeout" dataType="byte" unit="hour">24</Parameter>
  </Parameters>
</Response>
```
