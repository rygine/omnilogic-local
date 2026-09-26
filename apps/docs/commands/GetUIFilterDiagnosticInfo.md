---
opcode: 386
area: diagnostics
status: verified
summary: >-
  Reads the variable-speed pump's diagnostics: power, error status, and firmware
  revisions.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIFilterDiagnosticInfo

<CommandFacts />

Reads the variable-speed pump's diagnostics: power, error status, and firmware
revisions.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1386" />

`GetUIFilterDiagnosticInfoRsp`

| name                  | type | unit |
| --------------------- | ---- | ---- |
| `poolId`              | int  |      |
| `equipmentId`         | int  |      |
| `powerLsb`            | byte |      |
| `powerMsb`            | byte |      |
| `errorStatus`         | byte |      |
| `displayFwRevisionB1` | byte |      |
| `displayFwRevisionB2` | byte |      |
| `displayFwRevisionB3` | byte |      |
| `displayFwRevisionB4` | byte |      |
| `displayFwRevisionB5` | byte |      |
| `displayFwRevisionB6` | byte |      |
| `driveFwRevisionB1`   | byte |      |
| `driveFwRevisionB2`   | byte |      |
| `driveFwRevisionB3`   | byte |      |
| `driveFwRevisionB4`   | byte |      |
| `driveFwRevisionB5`   | byte |      |
| `driveFwRevisionB6`   | byte |      |

## Example

```typescript
const reply = await omni.command("GetUIFilterDiagnosticInfo", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFilterDiagnosticInfo</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIFilterDiagnosticInfoRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="EquipmentID" dataType="int">3</Parameter>
    <Parameter name="PowerLSB" dataType="byte">88</Parameter>
    <Parameter name="PowerMSB" dataType="byte">4</Parameter>
    <Parameter name="ErrorStatus" dataType="byte">0</Parameter>
    <Parameter name="DisplayFWRevisionB1" dataType="byte">49</Parameter>
    <Parameter name="DisplayFWRevisionB2" dataType="byte">48</Parameter>
    <Parameter name="DisplayFWRevisionB3" dataType="byte">49</Parameter>
    <Parameter name="DisplayFWRevisionB4" dataType="byte">53</Parameter>
    <Parameter name="DisplayFWRevisionB5" dataType="byte">32</Parameter>
    <Parameter name="DisplayFWRevisionB6" dataType="byte">0</Parameter>
    <Parameter name="DriveFWRevisionB1" dataType="byte">48</Parameter>
    <Parameter name="DriveFWRevisionB2" dataType="byte">48</Parameter>
    <Parameter name="DriveFWRevisionB3" dataType="byte">55</Parameter>
    <Parameter name="DriveFWRevisionB4" dataType="byte">51</Parameter>
    <Parameter name="DriveFWRevisionB5" dataType="byte">32</Parameter>
    <Parameter name="DriveFWRevisionB6" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
