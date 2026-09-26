---
opcode: 45
area: heater
status: verified
summary: Reads the heater's auto-mode differential in degrees.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetHeaterAutoDifferential

<CommandFacts />

Reads the heater's auto-mode differential in degrees.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1045" />

`UIGetHeaterAutoDifferentialRsp`

| name       | type | unit |
| ---------- | ---- | ---- |
| `poolId`   | int  |      |
| `heaterId` | int  |      |
| `data`     | int  |      |

## Example

```typescript
const reply = await omni.command("GetHeaterAutoDifferential", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetHeaterAutoDifferential</Name>
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
  <Name>UIGetHeaterAutoDifferentialRsp</Name>
  <Parameters>
    <Parameter name="PoolID" dataType="int">1</Parameter>
    <Parameter name="HeaterID" dataType="int">4</Parameter>
    <Parameter name="Data" dataType="int">2</Parameter>
  </Parameters>
</Response>
```
