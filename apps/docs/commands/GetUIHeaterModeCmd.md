---
opcode: 43
area: heater
status: verified
summary: "Reads the heater's mode: heat, cool, or auto."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIHeaterModeCmd

<CommandFacts />

Reads the heater's mode: heat, cool, or auto.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1043" />

`UIGetHeaterModeCmdRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `heaterId` | int  |      |
| `mode`     | int  |      |

## Example

```typescript
const reply = await omni.command("GetUIHeaterModeCmd", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIHeaterModeCmd</Name>
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
  <Name>UIGetHeaterModeCmdRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">4</Parameter>
    <Parameter name="Mode" dataType="int">0</Parameter>
  </Parameters>
</Response>
```
