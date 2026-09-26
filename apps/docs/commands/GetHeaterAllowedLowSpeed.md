---
opcode: 154
area: heater
status: verified
summary: Reads whether a heat source may run while the pump is at low speed.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetHeaterAllowedLowSpeed

<CommandFacts />

Reads whether a heat source may run while the pump is at low speed.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1154" />

`GetHeaterAllowedLowSpeedRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `heaterId` | int  |      |
| `speed`    | int  | RPM  |

## Example

```typescript
const reply = await omni.command("GetHeaterAllowedLowSpeed", {
  poolId: 1,
  equipmentId: 5,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterAllowedLowSpeed</Name>
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
  <Name>GetHeaterAllowedLowSpeedRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">5</Parameter>
    <Parameter name="Speed" dataType="int" unit="RPM">1</Parameter>
  </Parameters>
</Response>
```
