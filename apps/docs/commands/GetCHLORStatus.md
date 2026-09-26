---
opcode: 157
area: chlorinator
status: verified
summary: >-
  Reads the salt cell's live status: operating state, superchlorinate state,
  alert bits, instant and average salt.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCHLORStatus

<CommandFacts />

Reads the salt cell's live status: operating state, superchlorinate state, alert
bits, instant and average salt.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1157" />

`GetCHLORStatusRsp`

| name                 | type | unit |
| -------------------- | ---- | ---- |
| `poolId`             | int  |      |
| `chlorId`            | int  |      |
| `opState`            | byte |      |
| `scState`            | byte |      |
| `alertStatus`        | byte |      |
| `instantSaltHigh`    | byte |      |
| `instantSaltLow`     | byte |      |
| `averageSaltHigh`    | byte |      |
| `averageSaltLow`     | byte |      |
| `activelyDispensing` | byte |      |

## Example

```typescript
const reply = await omni.command("GetCHLORStatus", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORStatus</Name>
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
  <Name>GetCHLORStatusRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">7</Parameter>
    <Parameter name="OpState" dataType="byte">2</Parameter>
    <Parameter name="SCState" dataType="byte">0</Parameter>
    <Parameter name="AlertStatus" dataType="byte">128</Parameter>
    <Parameter name="InstantSaltHigh" dataType="byte">11</Parameter>
    <Parameter name="InstantSaltLow" dataType="byte">176</Parameter>
    <Parameter name="AverageSaltHigh" dataType="byte">12</Parameter>
    <Parameter name="AverageSaltLow" dataType="byte">145</Parameter>
    <Parameter name="ActivelyDispensing" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
