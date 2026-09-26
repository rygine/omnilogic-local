---
opcode: 359
area: heater
status: verified
summary: Reads the minimum pump speed a heat source requires.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetHeaterLowSpeed

<CommandFacts />

Reads the minimum pump speed a heat source requires.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1359" />

`GetHeaterLowSpeedRsp`

| name       | type | unit    |
| ---------- | ---- | ------- |
| `poolId`   | int  |         |
| `heaterId` | int  |         |
| `speed`    | int  | percent |

## Example

```typescript
const reply = await omni.command("GetHeaterLowSpeed", {
  poolId: 1,
  equipmentId: 5,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterLowSpeed</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">5</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterLowSpeedRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">5</Parameter>
    <Parameter name="Speed" dataType="int" unit="percent">60</Parameter>
  </Parameters>
</Response>
```
