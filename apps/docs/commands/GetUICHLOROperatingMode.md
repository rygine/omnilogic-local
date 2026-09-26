---
opcode: 280
area: chlorinator
status: verified
summary: "Reads the chlorinator's operating mode: timed or ORP."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUICHLOROperatingMode

<CommandFacts />

Reads the chlorinator's operating mode: timed or ORP.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1280" />

`GetUICHLOROperatingModeRsp`

| name            | type | unit |
| --------------- | ---- | ---- |
| `poolId`        | int  |      |
| `chlorId`       | int  |      |
| `operatingMode` | int  |      |

## Example

```typescript
const reply = await omni.command("GetUICHLOROperatingMode", {
  poolId: 1,
  equipmentId: 6,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUICHLOROperatingMode</Name>
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
  <Name>GetUICHLOROperatingModeRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="ChlorID" dataType="int">6</Parameter>
    <Parameter name="OperatingMode" dataType="int">1</Parameter>
  </Parameters>
</Response>
```
