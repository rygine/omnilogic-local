---
opcode: 12
area: heater
status: verified
summary: Reads the heater's set point.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIHeaterCmd

<CommandFacts />

Reads the heater's set point.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1012" />

`UIHeaterRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `heaterId` | int  |      |
| `temp`     | int  | F    |

## Example

```typescript
const reply = await omni.command("GetUIHeaterCmd", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIHeaterCmd</Name>
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
  <Name>UIHeaterRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">4</Parameter>
    <Parameter name="Temp" dataType="int" unit="F">94</Parameter>
  </Parameters>
</Response>
```
